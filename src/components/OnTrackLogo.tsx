import Image from "next/image";
import { COMPANY } from "@/lib/business";

/**
 * The ON TRACK by TRACE house mark.
 *
 * The artwork is used exactly as supplied — only its white ground was keyed
 * out so it can sit on the burgundy. Because the lockup is drawn in black,
 * gold and pink, black needs a light ground to read against: every placement
 * here puts the artwork on an ivory plate rather than straight onto the wine.
 */

const PLATE =
  "radial-gradient(circle at 30% 24%, #fffdf7 0%, #f6efe3 58%, #e6d8c4 100%)";

const PLATE_EDGE =
  "0 0 0 1px rgba(212,175,55,0.85), 0 0 0 4px rgba(43,8,17,0.9), 0 0 0 5px rgba(212,175,55,0.4), 0 8px 22px -10px rgba(0,0,0,0.85)";

/** Crown only — for headers and anywhere the wordmark would be unreadable. */
export function OnTrackMark({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: PLATE,
        boxShadow: PLATE_EDGE,
      }}
    >
      <Image
        src={COMPANY.mark}
        alt=""
        width={Math.round(size * 0.74)}
        height={Math.round(size * 0.53)}
        style={{ width: Math.round(size * 0.74), height: "auto" }}
      />
    </span>
  );
}

/**
 * Mark plus typeset wordmark — the everyday lockup for navigation bars.
 *
 * The wordmark is set rather than taken from the artwork so it stays crisp
 * and legible at small sizes, and so screen readers get real text.
 */
export function OnTrackLogo({
  size = "md",
  showTagline = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}) {
  const plate = { sm: 38, md: 48, lg: 64 }[size];
  const word = { sm: "text-base", md: "text-xl", lg: "text-2xl" }[size];

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <OnTrackMark size={plate} />
      <span className="flex flex-col leading-none">
        <span
          className={`gm-display ${word} font-semibold uppercase tracking-[0.18em]`}
          style={{ color: "var(--gold-bright)" }}
        >
          On Track
        </span>
        <span
          className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.34em]"
          style={{ color: "var(--cream-dim)" }}
        >
          by Trace
        </span>
        {showTagline && (
          <span className="gm-muted mt-1.5 text-[0.7rem] italic tracking-wide">
            {COMPANY.tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * The supplied artwork in full — tree, wordmark, tagline and roots — on an
 * ivory plate. Used where the brand is the subject rather than a label: the
 * Revenue Rescue start screen and the legal pages.
 */
export function OnTrackLockup({
  width = 260,
  className = "",
}: {
  width?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-grid place-items-center rounded-2xl p-5 ${className}`}
      style={{ background: PLATE, boxShadow: PLATE_EDGE }}
    >
      <Image
        src={COMPANY.logo}
        alt={`${COMPANY.name} — ${COMPANY.tagline}`}
        width={width}
        height={width}
        priority
        style={{ width, height: "auto" }}
      />
    </span>
  );
}

/** The small print that must accompany an unregistered mark. */
export function OnTrackTrademarkNote({ className = "" }: { className?: string }) {
  return (
    <span className={`gm-muted text-[11px] tracking-wide ${className}`}>
      {COMPANY.name} · ON TRACK Revenue Rescue™ — trade marks pending
    </span>
  );
}
