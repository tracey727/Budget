import Image from "next/image";

/**
 * The Budget Rescue mark.
 *
 * public/budget-rescue-logo.png is a tree-and-roots emblem in the maroon and
 * gold house palette, echoing the ON TRACK by TRACE "roots of every journey"
 * motif for this branch of the Rescue concept. It carries no text of its own
 * — the wordmark beside it is set in type, same as OnTrackLogo, so it stays
 * crisp at nav sizes and screen readers get real text.
 */
export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}) {
  const medallion = { sm: 38, md: 52, lg: 132 }[size];
  const art = { sm: 26, md: 36, lg: 92 }[size];
  const word = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl sm:text-3xl",
  }[size];

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <span
        aria-hidden
        className="relative grid shrink-0 place-items-center rounded-full"
        style={{
          width: medallion,
          height: medallion,
          background:
            "radial-gradient(circle at 32% 26%, #fffdf7 0%, #f6efe3 58%, #e6d8c4 100%)",
          boxShadow:
            "0 0 0 1px rgba(212,175,55,0.85), 0 0 0 4px rgba(43,8,17,0.9), 0 0 0 5px rgba(212,175,55,0.4), 0 8px 22px -10px rgba(0,0,0,0.85)",
        }}
      >
        <Image
          src="/budget-rescue-logo.png"
          alt=""
          width={art}
          height={art}
          priority={size === "lg"}
          style={{ width: "auto", height: art, objectFit: "contain" }}
        />
      </span>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span
            className={`gm-display ${word} font-bold uppercase tracking-[0.12em]`}
            style={{ color: "var(--gold-bright)" }}
          >
            Budget
          </span>
          <span
            className={`gm-display ${word} mt-0.5 font-bold uppercase tracking-[0.12em]`}
          >
            Rescue
            <span
              className="ml-1 align-super font-sans text-[0.4em] tracking-wider"
              aria-label="trade mark pending"
            >
              TM
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

/** The small print that must accompany an unregistered mark. */
export function TrademarkNote({ className = "" }: { className?: string }) {
  return (
    <span className={`gm-muted text-[11px] tracking-wide ${className}`}>
      Budget Rescue™ — trade mark pending
    </span>
  );
}
