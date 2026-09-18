import Link from "next/link";
import { requireTenant } from "@/lib/rescue/tenant";
import { recentImports } from "@/lib/rescue/queries";
import { SOURCES, SOURCE_TYPES } from "@/lib/rescue/sources";
import { formatInstant } from "@/lib/rescue/time";
import { UploadForm } from "./UploadForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  mapping: "Needs mapping",
  validating: "Validating",
  ready: "Ready to commit",
  committed: "Committed",
  failed: "Failed",
};

export default async function ImportsPage() {
  const context = await requireTenant();
  const jobs = await recentImports(context.tenant.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="gm-display text-3xl font-semibold">Import Centre</h1>
        <p className="gm-muted mt-1 text-sm">
          Export from your practice system as CSV or Excel and upload it here. Nothing is imported until you
          have seen exactly what was read, what was rejected and why.
        </p>
      </div>

      {context.can("import") ? (
        <UploadForm
          sources={SOURCE_TYPES.map((type) => ({
            type,
            label: SOURCES[type].label,
            description: SOURCES[type].description,
          }))}
        />
      ) : (
        <p className="gm-alert-warn text-sm">
          Your role can see imports but not create them. Ask an owner, admin or manager to upload.
        </p>
      )}

      <section>
        <h2 className="gm-display text-xl font-semibold">Previous imports</h2>
        {jobs.length === 0 ? (
          <p className="gm-muted mt-2 text-sm">No imports yet.</p>
        ) : (
          <div className="gm-scroll-x mt-3">
            <table className="gm-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th className="text-right">Rows</th>
                  <th className="text-right">Ready</th>
                  <th className="text-right">Rejected</th>
                  <th className="text-right">Hold</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/rescue/imports/${job.id}`} className="hover:text-brand-600">
                        {job.originalFilename}
                      </Link>
                      <span className="gm-muted block font-mono text-[10px]">
                        {job.fileSha256.slice(0, 12)}…
                      </span>
                    </td>
                    <td>{SOURCES[job.sourceType as keyof typeof SOURCES]?.label ?? job.sourceType}</td>
                    <td>{STATUS_LABEL[job.status] ?? job.status}</td>
                    <td className="text-right">{job.totalRows}</td>
                    <td className="text-right">{job.validRows}</td>
                    <td className="text-right">{job.invalidRows}</td>
                    <td className="text-right">{job.holdRows}</td>
                    <td className="gm-muted text-xs">
                      {formatInstant(job.createdAt, context.tenant.timezone)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
