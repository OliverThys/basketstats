import { useRef } from "react";

export interface ShotMarker {
  id: string;
  x: number;
  y: number;
  made: boolean;
}

interface ShotPadProps {
  markers: ShotMarker[];
  onPick?: (x: number, y: number) => void;
  interactive?: boolean;
}

/** Minimal tap-to-record court surface. Coordinates are normalized 0..1 so
 * they stay independent of screen size. A proper FIBA-dimension court render
 * (3pt arc, key, zones) is built out in Phase 3 — this is enough to capture
 * and replay shot locations now. */
export function ShotPad({ markers, onPick, interactive = true }: ShotPadProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onPick || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    onPick(Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1));
  }

  return (
    <div
      ref={ref}
      className="shot-pad"
      onClick={handleClick}
      role={interactive ? "button" : undefined}
      data-testid="shot-pad"
    >
      <div className="shot-pad-hoop" />
      {markers.map((marker) => (
        <span
          key={marker.id}
          className={marker.made ? "shot-marker made" : "shot-marker missed"}
          style={{ left: `${marker.x * 100}%`, top: `${marker.y * 100}%` }}
        />
      ))}
    </div>
  );
}
