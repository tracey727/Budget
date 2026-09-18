"use client";

import { useActionState, useState } from "react";
import { uploadImportAction } from "@/lib/rescue/actions/imports";
import { SubmitButton } from "@/components/SubmitButton";
import { Notice } from "@/components/rescue/Notice";

export function UploadForm({
  sources,
}: {
  sources: { type: string; label: string; description: string }[];
}) {
  const [state, action] = useActionState(uploadImportAction, undefined);
  const [selected, setSelected] = useState(sources[0]?.type ?? "");

  const description = sources.find((source) => source.type === selected)?.description;

  return (
    <form action={action} className="gm-card space-y-4">
      <Notice state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="gm-label" htmlFor="sourceType">
            What kind of export is this?
          </label>
          <select
            id="sourceType"
            name="sourceType"
            className="gm-input"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {sources.map((source) => (
              <option key={source.type} value={source.type}>
                {source.label}
              </option>
            ))}
          </select>
          {description && <p className="gm-muted mt-1 text-xs">{description}</p>}
        </div>

        <div>
          <label className="gm-label" htmlFor="file">
            CSV file
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,text/csv,text/plain"
            required
            className="gm-input file:mr-3 file:rounded file:border-0 file:bg-[rgba(212,175,55,0.16)] file:px-3 file:py-1 file:text-sm"
          />
          <p className="gm-muted mt-1 text-xs">
            CSV up to 5 MB and 20,000 rows. From Excel: File → Save As → CSV UTF-8. The file itself is not
            kept — only the rows, and a hash so a repeat upload can be spotted.
          </p>
        </div>
      </div>

      <SubmitButton pendingLabel="Reading the file…">Upload and map</SubmitButton>
    </form>
  );
}
