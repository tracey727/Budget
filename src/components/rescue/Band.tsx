import type { Confidence, PriorityBand, ValueBasis } from "@/lib/rescue/types";
import { BAND_LABEL, VALUE_BASIS_LABEL } from "@/lib/rescue/priority";
import { CONFIDENCE_LABEL } from "@/lib/rescue/labels";
import { formatMoney } from "@/lib/money";

/**
 * The priority band.
 *
 * Every badge carries the word as well as the colour: a red pill on its own is
 * unreadable to anyone who cannot distinguish it, and this is the signal the
 * whole queue is triaged on.
 */
export function BandBadge({ band, score }: { band: PriorityBand; score?: number | null }) {
  return (
    <span className={`rr-band rr-band-${band}`} title={score != null ? `Priority score ${score}` : undefined}>
      {BAND_LABEL[band]}
    </span>
  );
}

export function ConfidenceNote({ confidence }: { confidence: string }) {
  const label = CONFIDENCE_LABEL[confidence as Confidence] ?? confidence;
  return <span className="gm-muted text-xs">{label}</span>;
}

/**
 * An amount with what it actually means.
 *
 * The label is not decoration. "$1,240 outstanding" and "$1,240 unmatched" are
 * opposite situations, and showing the number without the basis is how a
 * dashboard ends up claiming money it does not have.
 */
export function ValueWithBasis({
  cents,
  basis,
  className = "",
}: {
  cents: number | null;
  basis: ValueBasis;
  className?: string;
}) {
  if (cents === null) {
    return (
      <span className={`gm-muted text-sm ${className}`} title="The source data carried no amount">
        No value claimed
      </span>
    );
  }

  return (
    <span className={className}>
      <span className="font-semibold">{formatMoney(cents)}</span>
      <span className="gm-muted ml-1.5 text-[11px] uppercase tracking-wide">
        {VALUE_BASIS_LABEL[basis]}
      </span>
    </span>
  );
}

export function DemoFlag() {
  return (
    <span className="rr-demo-flag" title="Synthetic data. No real client information.">
      Demonstration data
    </span>
  );
}
