import Link from "next/link";

export function PaywallCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="gm-card text-center">
      <span
        aria-hidden
        className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-brand-500/15 text-xl"
      >
        ✦
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="gm-muted mx-auto mt-2 max-w-md text-sm leading-relaxed">{body}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link href="/app/billing" className="gm-btn-primary">
          See plans
        </Link>
        <Link href="/pricing" className="gm-btn-secondary">
          Compare features
        </Link>
      </div>
    </div>
  );
}
