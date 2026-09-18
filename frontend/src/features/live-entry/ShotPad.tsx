import { useRef } from "react";

import { clamp01, toNormalizedPoint } from "../../domain/court";
import { FibaCourtSvg, type ShotMarker } from "../shot-chart/FibaCourtSvg";

export type { ShotMarker };

interface ShotPadProps {
  markers: ShotMarker[];
  onPick?: (x: number, y: number) => void;
  interactive?: boolean;
}

function pickNormalized(event: React.MouseEvent<HTMLDivElement>, pad: HTMLDivElement): { x: number; y: number } {
  const svg = pad.querySelector("svg");
  if (svg instanceof SVGSVGElement) {
    const ctm = svg.getScreenCTM?.();
    if (ctm) {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const local = point.matrixTransform(ctm.inverse());
      return toNormalizedPoint(local.x, local.y);
    }
  }
  const rect = pad.getBoundingClientRect();
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

/** Tap-to-record FIBA court surface. Coordinates are normalized 0..1 so they
 * stay independent of screen size; the court itself is rendered by
 * FibaCourtSvg using real FIBA dimensions. Clicks are mapped through the SVG
 * CTM when available (correct even with letterboxing), with a bounding-box
 * fallback for jsdom. */
export function ShotPad({ markers, onPick, interactive = true }: ShotPadProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onPick || !ref.current) return;
    const { x, y } = pickNormalized(event, ref.current);
    onPick(x, y);
  }

  return (
    <div
      ref={ref}
      className="shot-pad"
      onClick={handleClick}
      role={interactive ? "button" : undefined}
      data-testid="shot-pad"
    >
      <FibaCourtSvg markers={markers} />
    </div>
  );
}
