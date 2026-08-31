import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/require";
import { listTransactions } from "@/lib/data/queries";
import { formatDateAu } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Escapes a value for CSV, quoting when it contains a delimiter or quote. */
function cell(value: string | null | undefined): string {
  const text = value ?? "";
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  const user = await requireUserApi();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!user.limits.dataExport) {
    return NextResponse.json(
      { error: "CSV export is part of Personal Premium." },
      { status: 403 },
    );
  }

  const rows = await listTransactions(user.id, { limit: 50_000 });

  const header = [
    "Date",
    "Description",
    "Merchant",
    "Category",
    "Account",
    "Amount (AUD)",
    "GST (AUD)",
    "Business",
    "Notes",
  ];

  const lines = [header.join(",")];

  for (const row of rows) {
    lines.push(
      [
        cell(formatDateAu(row.transaction.occurredOn)),
        cell(row.transaction.description),
        cell(row.transaction.merchant),
        cell(row.categoryName ?? "Uncategorised"),
        cell(row.accountName),
        cell(row.transaction.amount),
        cell(row.transaction.gstAmount),
        row.transaction.isBusiness ? "Yes" : "No",
        cell(row.transaction.notes),
      ].join(","),
    );
  }

  // A BOM makes Excel open the file as UTF-8 rather than mangling accents.
  const body = `﻿${lines.join("\r\n")}\r\n`;
  const filename = `gen-money-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
