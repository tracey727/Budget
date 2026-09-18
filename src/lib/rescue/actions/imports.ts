"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { rrImportJobs, rrImportMappings, rrImportRows } from "@/lib/db/schema";
import { recordAudit } from "@/lib/rescue/audit";
import { commitRows } from "@/lib/rescue/commit";
import { isDateConvention, missingRequired, suggestMapping, toMappingConfig } from "@/lib/rescue/mapping";
import { isParseFailure, parseUpload } from "@/lib/rescue/parse";
import { runDetection } from "@/lib/rescue/runner";
import { isSourceType, sourceDefinition } from "@/lib/rescue/sources";
import { requireCapability } from "@/lib/rescue/tenant";
import { normaliseRow, type MappingConfig } from "@/lib/rescue/validate";

import type { FormState } from "./types";

/** Loads a job and proves it belongs to this workspace before anything else. */
async function jobFor(tenantId: string, jobId: string) {
  const rows = await db()
    .select()
    .from(rrImportJobs)
    .where(and(eq(rrImportJobs.id, jobId), eq(rrImportJobs.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function uploadImportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  const sourceType = String(formData.get("sourceType") ?? "");
  if (!isSourceType(sourceType)) return { error: "Choose what kind of export this is." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to upload." };

  const parsed = await parseUpload(file);
  if (isParseFailure(parsed)) return { error: parsed.error };

  // A duplicate upload is a warning, not a refusal — re-importing a corrected
  // export is normal, and commits are idempotent anyway.
  const previous = await db()
    .select({ id: rrImportJobs.id, createdAt: rrImportJobs.createdAt, status: rrImportJobs.status })
    .from(rrImportJobs)
    .where(and(eq(rrImportJobs.tenantId, context.tenant.id), eq(rrImportJobs.fileSha256, parsed.sha256)))
    .limit(1);

  const created = await db()
    .insert(rrImportJobs)
    .values({
      tenantId: context.tenant.id,
      sourceType,
      originalFilename: file.name,
      fileSha256: parsed.sha256,
      status: "mapping",
      headersJson: parsed.headers,
      mappingJson: {
        fields: suggestMapping(sourceType, parsed.headers),
        dateConvention: "iso",
        timeZone: context.tenant.timezone,
      },
      totalRows: parsed.rows.length,
      createdBy: context.viewer.id,
    })
    .returning({ id: rrImportJobs.id });

  const jobId = created[0].id;

  // Rows are stored in batches: one statement per row would be thousands of
  // round trips on a serverless driver.
  const BATCH = 200;
  for (let index = 0; index < parsed.rows.length; index += BATCH) {
    const slice = parsed.rows.slice(index, index + BATCH);
    await db()
      .insert(rrImportRows)
      .values(
        slice.map((row, offset) => ({
          importJobId: jobId,
          tenantId: context.tenant.id,
          rowNumber: index + offset + 2, // +2: 1-based, and the header is row 1
          rawJson: row,
          validationStatus: "valid",
        })),
      );
  }

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "import.created",
    entityType: "import_job",
    entityId: jobId,
    metadata: {
      filename: file.name,
      sourceType,
      rows: parsed.rows.length,
      sha256: parsed.sha256,
      duplicateOf: previous[0]?.id ?? null,
    },
  });

  redirect(`/rescue/imports/${jobId}`);
}

export async function saveMappingAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  const jobId = String(formData.get("jobId") ?? "");
  const job = await jobFor(context.tenant.id, jobId);
  if (!job) return { error: "That import no longer exists." };
  if (job.status === "committed") return { error: "That import has already been committed." };

  const definition = sourceDefinition(job.sourceType);
  if (!definition) return { error: "That import has an unknown source type." };

  const fields: Record<string, string | null> = {};
  for (const field of definition.fields) {
    const value = String(formData.get(`field_${field.key}`) ?? "");
    fields[field.key] = value === "" ? null : value;
  }

  // One column cannot feed two canonical fields — that is always a mistake.
  const used = Object.values(fields).filter(Boolean) as string[];
  const duplicated = used.find((header, index) => used.indexOf(header) !== index);
  if (duplicated) {
    return { error: `The column "${duplicated}" is mapped to more than one field. Each column can only be used once.` };
  }

  const missing = missingRequired(job.sourceType, fields);
  if (missing.length > 0) {
    return { error: `Still to map: ${missing.join(", ")}.` };
  }

  const conventionRaw = String(formData.get("dateConvention") ?? "iso");
  const mapping: MappingConfig = {
    fields,
    dateConvention: isDateConvention(conventionRaw) ? conventionRaw : "iso",
    timeZone: context.tenant.timezone,
  };

  await db()
    .update(rrImportJobs)
    .set({ mappingJson: mapping, status: "validating" })
    .where(and(eq(rrImportJobs.id, jobId), eq(rrImportJobs.tenantId, context.tenant.id)));

  if (formData.get("saveTemplate") === "on") {
    const existing = await db()
      .select({ version: rrImportMappings.version })
      .from(rrImportMappings)
      .where(
        and(eq(rrImportMappings.tenantId, context.tenant.id), eq(rrImportMappings.sourceType, job.sourceType)),
      );
    const nextVersion = existing.reduce((max, row) => Math.max(max, row.version), 0) + 1;

    await db().insert(rrImportMappings).values({
      tenantId: context.tenant.id,
      sourceType: job.sourceType,
      name: `${definition.label} template v${nextVersion}`,
      version: nextVersion,
      mappingJson: mapping,
      createdBy: context.viewer.id,
    });
  }

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "import.mapped",
    entityType: "import_job",
    entityId: jobId,
    metadata: { mapping },
  });

  return validateImportAction(undefined, formData);
}

export async function validateImportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  const jobId = String(formData.get("jobId") ?? "");
  const job = await jobFor(context.tenant.id, jobId);
  if (!job) return { error: "That import no longer exists." };
  if (job.status === "committed") return { error: "That import has already been committed." };

  const mapping = toMappingConfig(job.mappingJson, context.tenant.timezone);

  const rows = await db()
    .select({ id: rrImportRows.id, rowNumber: rrImportRows.rowNumber, rawJson: rrImportRows.rawJson })
    .from(rrImportRows)
    .where(eq(rrImportRows.importJobId, jobId))
    .orderBy(asc(rrImportRows.rowNumber));

  let valid = 0;
  let invalid = 0;
  let hold = 0;

  for (const row of rows) {
    const result = normaliseRow(job.sourceType, mapping, (row.rawJson ?? {}) as Record<string, string>);
    if (result.status === "valid") valid += 1;
    else if (result.status === "invalid") invalid += 1;
    else hold += 1;

    await db()
      .update(rrImportRows)
      .set({
        normalisedJson: result.values,
        validationStatus: result.status,
        validationErrors: result.issues,
      })
      .where(eq(rrImportRows.id, row.id));
  }

  await db()
    .update(rrImportJobs)
    .set({ status: "ready", validRows: valid, invalidRows: invalid, holdRows: hold, totalRows: rows.length })
    .where(and(eq(rrImportJobs.id, jobId), eq(rrImportJobs.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "import.validated",
    entityType: "import_job",
    entityId: jobId,
    metadata: { valid, invalid, hold, total: rows.length },
  });

  revalidatePath(`/rescue/imports/${jobId}`);
  return {
    ok: true,
    message: `${valid} row${valid === 1 ? "" : "s"} ready, ${invalid} rejected, ${hold} on hold.`,
  };
}

export async function commitImportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  const jobId = String(formData.get("jobId") ?? "");
  const job = await jobFor(context.tenant.id, jobId);
  if (!job) return { error: "That import no longer exists." };
  if (job.status === "committed") return { error: "That import has already been committed." };
  if (job.status !== "ready") return { error: "Validate the rows before committing them." };
  if (!isSourceType(job.sourceType)) return { error: "That import has an unknown source type." };

  const rows = await db()
    .select({ normalisedJson: rrImportRows.normalisedJson })
    .from(rrImportRows)
    .where(and(eq(rrImportRows.importJobId, jobId), eq(rrImportRows.validationStatus, "valid")))
    .orderBy(asc(rrImportRows.rowNumber));

  if (rows.length === 0) {
    return { error: "There are no valid rows to commit. Fix the file and upload it again." };
  }

  const result = await commitRows(
    context.tenant.id,
    jobId,
    job.sourceType,
    rows.map((row) => (row.normalisedJson ?? {}) as Record<string, string | number | null>),
  );

  await db()
    .update(rrImportJobs)
    .set({ status: "committed", committedAt: new Date() })
    .where(and(eq(rrImportJobs.id, jobId), eq(rrImportJobs.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "import.committed",
    entityType: "import_job",
    entityId: jobId,
    metadata: { committed: result.committed, sourceType: job.sourceType },
  });

  revalidatePath("/rescue/imports");
  revalidatePath(`/rescue/imports/${jobId}`);
  return { ok: true, message: `${result.committed} rows committed. Run detection when you are ready.` };
}

export async function discardImportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("import");

  const jobId = String(formData.get("jobId") ?? "");
  const job = await jobFor(context.tenant.id, jobId);
  if (!job) return { error: "That import no longer exists." };
  if (job.status === "committed") {
    return { error: "A committed import cannot be discarded. Its records are part of the workspace now." };
  }

  await db()
    .delete(rrImportJobs)
    .where(and(eq(rrImportJobs.id, jobId), eq(rrImportJobs.tenantId, context.tenant.id)));

  await recordAudit({
    tenantId: context.tenant.id,
    actorUserId: context.viewer.id,
    eventType: "import.deleted",
    entityType: "import_job",
    entityId: jobId,
    metadata: { filename: job.originalFilename },
  });

  redirect("/rescue/imports");
}

const runSchema = z.object({ ruleId: z.string().optional() });

export async function runDetectionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await requireCapability("run_rules");

  const parsed = runSchema.safeParse({ ruleId: formData.get("ruleId")?.toString() || undefined });
  const ruleIds = parsed.success && parsed.data.ruleId ? [parsed.data.ruleId] : undefined;

  const summary = await runDetection(context, ruleIds);

  revalidatePath("/rescue");
  revalidatePath("/rescue/findings");
  revalidatePath("/rescue/queue");

  const parts = [
    `${summary.created} new`,
    `${summary.updated} updated`,
    `${summary.resolved} resolved`,
  ].join(", ");

  if (summary.failures.length > 0) {
    return {
      ok: true,
      message: `Detection finished with ${summary.failures.length} rule failure(s): ${parts}. The remaining rules still ran.`,
    };
  }

  return { ok: true, message: `Detection complete — ${parts}.` };
}

/** Counts by validation status, used by the tabs on the validation screen. */
export async function importRowCounts(tenantId: string, jobId: string) {
  const rows = await db()
    .select({ status: rrImportRows.validationStatus, count: sql<string>`count(*)` })
    .from(rrImportRows)
    .where(and(eq(rrImportRows.importJobId, jobId), eq(rrImportRows.tenantId, tenantId)))
    .groupBy(rrImportRows.validationStatus);

  return {
    valid: Number(rows.find((r) => r.status === "valid")?.count ?? 0),
    invalid: Number(rows.find((r) => r.status === "invalid")?.count ?? 0),
    hold: Number(rows.find((r) => r.status === "hold")?.count ?? 0),
  };
}
