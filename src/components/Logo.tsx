import { BUSINESS } from "@/lib/business";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-black text-white"
      >
        G
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-base font-black tracking-tight">
          GENEVIEVE <span className="text-brand-600">App</span>
        </span>
        <span className="gm-muted mt-0.5 text-[10px] font-semibold uppercase tracking-widest">
          {BUSINESS.productName}
        </span>
      </span>
    </span>
  );
}
