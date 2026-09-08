/**
 * The verification mark, and the small marks that sit around it.
 *
 * Verification is the only claim this platform actually makes, so the thing
 * carrying it in the headline is drawn as a stamp rather than a generic tick
 * bubble: a zigzag ring, cut the way a wax seal or a certificate seal is cut.
 * The teeth are generated rather than hand-drawn, so the ring stays regular at
 * any size and the shape can be retuned from three numbers.
 *
 * The ring turns, slowly enough to read as a seal settling rather than as a
 * spinner. It is the only ornamental motion in the hero, and the global
 * prefers-reduced-motion rule at the foot of globals.css stops it outright.
 */

const TEETH = 22;
const OUTER = 15.6;
const INNER = 12.5;

/** A zigzag ring: alternating outer and inner points around a single centre. */
function zigzagRing(): string {
  const points: string[] = [];
  for (let i = 0; i < TEETH * 2; i++) {
    const radius = i % 2 === 0 ? OUTER : INNER;
    const angle = (Math.PI * i) / TEETH - Math.PI / 2;
    const x = 16 + radius * Math.cos(angle);
    const y = 16 + radius * Math.sin(angle);
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
}

const RING = zigzagRing();

export function VerifiedSeal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d={RING} className="seal-spin" fill="var(--color-lime)" />
      {/* The tick sits still while the seal turns under it, so the mark stays
          readable instead of tumbling. */}
      <path
        d="M10.6 16.3 14.1 19.8 21.4 12"
        fill="none"
        stroke="var(--color-widget-black-2)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A four-point sparkle, used once, beside the seal. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 0c1 7 4 10 12 12-8 2-11 5-12 12-1-7-4-10-12-12C8 10 11 7 12 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
