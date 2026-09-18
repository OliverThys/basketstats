const FOUL_LIMIT = 5;

interface FoulDotsProps {
  count: number;
  className?: string;
}

/** Renders `count` filled dots against a fixed-size row of empty ones (FIBA's
 * 5-personal-foul limit), matching the reference app's "○○○●●" foul readout
 * instead of a bare number. */
export function FoulDots({ count, className }: FoulDotsProps) {
  const filled = Math.min(count, FOUL_LIMIT);
  return (
    <span className={["foul-dots", className].filter(Boolean).join(" ")}>
      {Array.from({ length: FOUL_LIMIT }, (_, index) => (
        <span key={index} className={index < filled ? "foul-dot filled" : "foul-dot"} />
      ))}
    </span>
  );
}
