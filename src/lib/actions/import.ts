"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/require";
import { centsToDecimalString } from "@/lib/money";
import { countTransactions, ownsAccount } from "@/lib/data/queries";
import { detectMapping, extractRows, parseCsv } from "@/lib/csv";

export type ImportState =
  | { error: string }
  | { ok: true; imported: number; duplicates: number; skipped: number; errors: string[] }
  | undefined;

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — comfortably more than a year of statements.
const MAX_ROWS = 5000;

async function dedupeHash(parts: string[]): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(parts.join("|")),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const user = await requireUser();

  if (!user.limits.csvImport) {
    return { error: "CSV import is part of Personal Premium. Upgrade to use it." };
  }

  const accountId = String(formData.get("accountId") ?? "");
  if (!z.string().uuid().safeParse(accountId).success) {
    return { error: "Choose an account to import into." };
  }
  if (!(await ownsAccount(user.id, accountId))) {
    return { error: "That account does not exist." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file to import." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "That file is larger than 2 MB. Split it and import in parts." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) return { error: "That file appears to be empty." };

  const mapping = detectMapping(rows);
  if (!mapping) {
    return {
      error:
        "Could not work out the columns. The file needs a date, a description and an amount (or debit and credit columns).",
    };
  }

  const parsed = extractRows(rows, mapping);
  if (parsed.rows.length === 0) {
    return {
      error: `No usable rows found. ${parsed.errors[0] ?? "Check the file format."}`,
    };
  }
  if (parsed.rows.length > MAX_ROWS) {
    return { error: `That file has more than ${MAX_ROWS} rows. Split it and import in parts.` };
  }

  // Starter accounts cannot import, but a Premium user who downgrades could
  // still hit a limit — check before writing anything.
  if (Number.isFinite(user.limits.transactions)) {
    const used = await countTransactions(user.id);
    if (used + parsed.rows.length > user.limits.transactions) {
      return { error: "This import would exceed your plan's transaction limit." };
    }
  }

  const batchId = crypto.randomUUID();

  const values = await Promise.all(
    parsed.rows.map(async (row) => ({
      userId: user.id,
      accountId,
      amount: centsToDecimalString(row.amountCents),
      description: row.description,
      occurredOn: row.occurredOn,
      importBatchId: batchId,
      dedupeHash: await dedupeHash([
        user.id,
        accountId,
        row.occurredOn,
        String(row.amountCents),
        row.description.toLowerCase(),
      ]),
    })),
  );

  // Two statements can overlap, and the same file can be uploaded twice.
  // The unique index on (user, dedupe_hash) makes the insert idempotent, and
  // `returning` tells us how many rows actually landed.
  let imported = 0;
  const CHUNK = 500;
  for (let i = 0; i < values.length; i += CHUNK) {
    const inserted = await db()
      .insert(transactions)
      .values(values.slice(i, i + CHUNK))
      .onConflictDoNothing({ target: [transactions.userId, transactions.dedupeHash] })
      .returning({ id: transactions.id });
    imported += inserted.length;
  }

  revalidatePath("/app");
  revalidatePath("/app/transactions");

  return {
    ok: true,
    imported,
    duplicates: values.length - imported,
    skipped: parsed.skipped,
    errors: parsed.errors,
  };
}
