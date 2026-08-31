import Link from "next/link";

export function UpgradeNotice({ message }: { message: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3">
      <p className="text-sm font-medium">{message}</p>
      <Link href="/app/billing" className="gm-btn-primary shrink-0 py-1.5 text-xs">
        Upgrade
      </Link>
    </div>
  );
}
