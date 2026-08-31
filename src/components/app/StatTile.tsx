export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-brand-600"
      : tone === "negative"
        ? "text-red-600 dark:text-red-400"
        : "";

  return (
    <div className="gm-card">
      <p className="gm-muted text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className={`mt-1.5 text-2xl font-black ${toneClass}`}>{value}</p>
      {hint && <p className="gm-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}
