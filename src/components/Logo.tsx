export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white"
      >
        G
      </span>
      <span className="text-lg font-black tracking-tight">
        GEN <span className="text-brand-600">MONEY</span>
      </span>
    </span>
  );
}
