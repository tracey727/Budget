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

export async function GET(request: Request) {
  const user = await requireUserApi();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!user.limits.dataExport) {
    return NextResponse.json(
      { error: "CSV export is part of Personal Premium." },
      { status: 403 },
    );
  }

  // An accountant wants settled money only; a person checking their own
  // records usually wants everything. Default to settled and let the caller
  // ask for the rest.
  const url = new URL(request.url);
  const include = url.searchParams.get("include");
  const rows = await listTransactions(user.id, {
    limit: 50_000,
    status: include === "all" || include === "pending" ? undefined : "posted",
  });

  const header = [
    "Date",
    "Description",
    "Merchant",
    "Category",
    "Account",
    "Amount (AUD)",
    "Status",
    "Cleared",
    "Source",
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
        cell(
          row.transaction.status === "posted"
            ? "Cleared"
            : row.transaction.status === "pending"
              ? "Pending"
              : "Released",
        ),
        cell(
          row.transaction.clearedAt
            ? formatDateAu(row.transaction.clearedAt.toISOString().slice(0, 10))
            : "",
        ),
        cell(
          row.transaction.source === "bank"
            ? "Bank feed"
            : row.transaction.source === "import"
              ? "CSV import"
              : "Entered by hand",
        ),
        cell(row.transaction.gstAmount),
        row.transaction.isBusiness ? "Yes" : "No",
        cell(row.transaction.notes),
      ].join(","),
    );
  }

  // A BOM makes Excel open the file as UTF-8 rather than mangling accents.
  const body = `﻿${lines.join("\r\n")}\r\n`;
  const filename = `genevieve-transactions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
