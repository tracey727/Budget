"use client";

import { useActionState } from "react";
import { saveMappingAction } from "@/lib/rescue/actions/imports";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";
import type { CanonicalField } from "@/lib/rescue/sources";
import type { MappingConfig } from "@/lib/rescue/validate";

/**
 * The mapping wizard.
 *
 * Each canonical field shows the column it will read, an example value from the
 * file, and what happens if it is left unmapped. The suggestion is pre-filled
 * but never acted on by itself — the person confirms it before a single row is
 * read.
 */
export function MappingForm({
  jobId,
  fields,
  headers,
  examples,
  mapping,
}: {
  jobId: string;
  fields: CanonicalField[];
  headers: string[];
  examples: Record<string, string>;
  mapping: MappingConfig;
}) {
  const [state, action] = useActionState(saveMappingAction, undefined);

  return (
    <form action={action} className="gm-card space-y-5">
      <input type="hidden" name="jobId" value={jobId} />
      <Notice state={state} />

      <div>
        <h2 className="gm-display text-xl font-semibold">Map your columns</h2>
        <p className="gm-muted mt-1 text-sm">
          Every field below is read from the column you choose. Anything left blank is simply not imported.
        </p>
      </div>

      <div className="gm-scroll-x">
        <table className="gm-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Your column</th>
              <th>Example from your file</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const selected = mapping.fields[field.key] ?? "";
              return (
                <tr key={field.key}>
                  <td>
                    <label htmlFor={`field_${field.key}`} className="font-medium">
                      {field.label}
                    </label>
                    {field.required ? (
                      <span className="gm-pill ml-2">Required</span>
                    ) : (
                      <span className="gm-muted ml-2 text-[10px] uppercase tracking-wide">Optional</span>
                    )}
                    <p className="gm-muted mt-0.5 text-xs">{field.help}</p>
                  </td>
                  <td>
                    <select
                      id={`field_${field.key}`}
                      name={`field_${field.key}`}
                      defaultValue={selected}
                      className="gm-input py-1.5 text-sm"
                    >
                      <option value="">Not in my file</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="gm-muted text-xs">
                    {selected ? examples[selected] || "(blank in the first rows)" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="dateConvention">
            Date convention in this file
          </label>
          <select
            id="dateConvention"
            name="dateConvention"
            defaultValue={mapping.dateConvention}
            className="gm-input"
          >
            <option value="iso">ISO — 2026-09-01</option>
            <option value="au_dmy">Australian — 01/09/2026 (day first)</option>
          </select>
          <p className="gm-muted mt-1 text-xs">
            A date like 03/04/2026 is held rather than guessed unless you say which convention the file uses.
          </p>
        </div>

        <label className="flex items-start gap-2 self-end pb-1 text-sm">
          <input type="checkbox" name="saveTemplate" className="mt-1" />
          <span>
            Save this as a reusable template
            <span className="gm-muted block text-xs">
              So next month&rsquo;s export from the same system maps itself.
            </span>
          </span>
        </label>
      </div>

      <SubmitButton pendingLabel="Validating every row…">Save mapping and validate</SubmitButton>
    </form>
  );
}
