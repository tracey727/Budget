import Link from "next/link";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="gm-card text-center">
      <h3 className="font-bold">{title}</h3>
      <p className="gm-muted mx-auto mt-1.5 max-w-md text-sm">{body}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="gm-btn-primary mt-4">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
