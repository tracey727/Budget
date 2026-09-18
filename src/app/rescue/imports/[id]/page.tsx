import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rrImportJobs, rrImportRows } from "@/lib/db/schema";
import { requireTenant } from "@/lib/rescue/tenant";
import { sourceDefinition } from "@/lib/rescue/sources";
import { toMappingConfig } from "@/lib/rescue/mapping";
import { formatInstant } from "@/lib/rescue/time";
import type { FieldIssue } from "@/lib/rescue/validate";
import { MappingForm } from "./MappingForm";
import { CommitForm } from "./CommitForm";

export const dynamic = "force-dynamic";

type RowPreview = {
  rowNumber: number;
  status: string;
  issues: FieldIssue[];
  raw: Record<string, string>;
};

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const context = await requireTenant();
  const { id } = await params;
  const { tab } = await searchParams;

  const jobs = await db()
    .select()
    .from(rrImportJobs)
    .where(and(eq(rrImportJobs.id, id), eq(rrImportJobs.tenantId, context.tenant.id)))
    .limit(1);

  const job = jobs[0];
  if (!job) notFound();

  const definition = sourceDefinition(job.sourceType);
  if (!definition) notFound();

  const headers = (job.headersJson ?? []) as string[];
  const mapping = toMappingConfig(job.mappingJson, context.tenant.timezone);

  // A handful of rows is enough to fill the example column in the wizard.
  const sample = await db()
    .select({ rawJson: rrImportRows.rawJson })
    .from(rrImportRows)
    .where(eq(rrImportRows.importJobId, job.id))
    .orderBy(asc(rrImportRows.rowNumber))
    .limit(5);

  const examples: Record<string, string> = {};
  for (const header of headers) {
    const found = sample
      .map((row) => (row.rawJson as Record<string, string>)?.[header] ?? "")
      .find((value) => value.trim() !== "");
    examples[header] = found ?? "";
  }

  const activeTab = tab === "invalid" || tab === "hold" ? tab : "valid";
  const validated = job.status === "ready" || job.status === "committed";

  const rows: RowPreview[] = validated
    ? (
        await db()
          .select({
            rowNumber: rrImportRows.rowNumber,
            status: rrImportRows.validationStatus,
            errors: rrImportRows.validationErrors,
            rawJson: rrImportRows.rawJson,
          })
          .from(rrImportRows)
          .where(and(eq(rrImportRows.importJobId, job.id), eq(rrImportRows.validationStatus, activeTab)))
          .orderBy(asc(rrImportRows.rowNumber))
          .limit(100)
      ).map((row) => ({
        rowNumber: row.rowNumber,
        status: row.status,
        issues: (row.errors ?? []) as FieldIssue[],
        raw: (row.rawJson ?? {}) as Record<string, string>,
      }))
    : [];

  const tabs = [
    { key: "valid", label: `Ready (${job.validRows})` },
    { key: "invalid", label: `Rejected (${job.invalidRows})` },
    { key: "hold", label: `On hold (${job.holdRows})` },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/rescue/imports" className="gm-muted text-sm hover:text-brand-600">
          ← Import Centre
        </Link>
        <h1 className="gm-display mt-2 text-3xl font-semibold">{job.originalFilename}</h1>
        <p className="gm-muted mt-1 text-sm">
          {definition.label} · {job.totalRows} rows · uploaded{" "}
          {formatInstant(job.createdAt, context.tenant.timezone)}
          {job.committedAt && ` · committed ${formatInstant(job.committedAt, context.tenant.timezone)}`}
        </p>
      </div>

      {job.status === "committed" ? (
        <p className="gm-alert-ok text-sm">
          This import has been committed. {job.validRows} rows are part of the workspace. Re-uploading the
          same export updates those records rather than duplicating them.
        </p>
      ) : (
        context.can("import") && (
          <MappingForm
            jobId={job.id}
            fields={definition.fields}
            headers={headers}
            examples={examples}
            mapping={mapping}
          />
        )
      )}

      {validated && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="gm-display text-xl font-semibold">Validation results</h2>
            {job.status === "ready" && context.can("import") && (
              <CommitForm jobId={job.id} validRows={job.validRows} />
            )}
          </div>

          <div className="gm-toggle-bar mt-3" role="tablist" aria-label="Validation results">
            {tabs.map((entry) => (
              <Link
                key={entry.key}
                href={`/rescue/imports/${job.id}?tab=${entry.key}`}
                role="tab"
                aria-selected={activeTab === entry.key}
                className="gm-toggle"
              >
                {entry.label}
              </Link>
            ))}
          </div>

          {activeTab === "hold" && job.holdRows > 0 && (
            <p className="gm-alert-warn mt-3 text-sm">
              These rows were readable but something about them is ambiguous or contradictory. They are not
              committed and nothing is guessed on their behalf — fix them at the source, or map the date
              convention explicitly, and upload again.
            </p>
          )}

          {rows.length === 0 ? (
            <p className="gm-muted mt-3 text-sm">No rows in this group.</p>
          ) : (
            <div className="gm-scroll-x mt-3">
              <table className="gm-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    {activeTab === "valid" ? (
                      headers.slice(0, 6).map((header) => <th key={header}>{header}</th>)
                    ) : (
                      <th>What is wrong</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className={activeTab === "hold" ? "rr-row-hold" : undefined}>
                      <td className="font-mono text-xs">{row.rowNumber}</td>
                      {activeTab === "valid" ? (
                        headers.slice(0, 6).map((header) => (
                          <td key={header} className="text-xs">
                            {row.raw[header] || <span className="gm-muted">—</span>}
                          </td>
                        ))
                      ) : (
                        <td>
                          <ul className="space-y-1 text-sm">
                            {row.issues.map((issue, index) => (
                              <li key={index}>
                                <span className="gm-muted">{issue.header ?? issue.field}:</span>{" "}
                                {issue.message}
                              </li>
                            ))}
                          </ul>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 100 && (
                <p className="gm-muted mt-2 text-xs">Showing the first 100 rows in this group.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
