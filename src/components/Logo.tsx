import Image from "next/image";

/**
 * The Genevieve App mark.
 *
 * The logo artwork is used exactly as supplied — only its white background was
 * made transparent so it can sit on the burgundy. It is presented on an ivory
 * medallion because the artwork is black and gold, and black needs a light
 * ground to read against.
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
    sm: "text-xl",
    md: "text-[1.75rem]",
    lg: "text-5xl sm:text-6xl",
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
          src="/genevieve-logo.png"
          alt=""
          width={art}
          height={art}
          priority={size === "lg"}
          style={{ width: "auto", height: art, objectFit: "contain" }}
        />
      </span>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className={`gm-script ${word} leading-[1.05]`}>
            Genevieve
            <span
              className="ml-1 align-super font-sans text-[0.3em] tracking-wider"
              aria-label="trade mark pending"
            >
              TM
            </span>
          </span>
          <span
            className="gm-display mt-1 text-[0.62em] font-semibold uppercase tracking-[0.32em]"
            style={{ color: "var(--cream-dim)" }}
          >
            Budget App
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
      Genevieve App™ — trade mark pending
    </span>
  );
}
