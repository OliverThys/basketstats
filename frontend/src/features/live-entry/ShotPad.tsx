import { useRef } from "react";

import { clamp01, toNormalizedPoint } from "../../domain/court";
import { FibaCourtSvg, type ShotMarker } from "../shot-chart/FibaCourtSvg";

export type { ShotMarker };

interface ShotPadProps {
  markers: ShotMarker[];
  onPick?: (x: number, y: number) => void;
  interactive?: boolean;
}

function pickNormalized(event: { clientX: number; clientY: number }, pad: HTMLDivElement): { x: number; y: number } {
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
 * FibaCourtSvg using real FIBA dimensions. Picks are mapped through the SVG
 * CTM when available (correct even with letterboxing), with a bounding-box
 * fallback for jsdom.
 *
 * Uses Pointer Events rather than onClick: a plain <div>'s onClick handler
 * (attached via addEventListener, not an HTML `onclick` attribute) is not
 * guaranteed to fire from a touch tap on iOS/iPadOS Safari unless the
 * element resolves as "clickable" (cursor: pointer, a real onclick
 * attribute, role=button, etc.) — this court uses `cursor: crosshair`, so
 * touch taps on iPad were silently swallowed. Pointer events don't have
 * that ambiguity and fire uniformly for mouse, touch and pen. */
export function ShotPad({ markers, onPick, interactive = true }: ShotPadProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !onPick || !ref.current) return;
    event.preventDefault();
    const { x, y } = pickNormalized(event, ref.current);
    onPick(x, y);
  }

  return (
    <div
      ref={ref}
      className="shot-pad"
      onPointerUp={handlePointerUp}
      role={interactive ? "button" : undefined}
      data-testid={interactive ? "shot-pad" : "shot-pad-mini"}
    >
      <FibaCourtSvg markers={markers} />
    </div>
  );
}
