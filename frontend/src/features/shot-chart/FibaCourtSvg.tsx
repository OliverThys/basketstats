import { forwardRef } from "react";

import {
  BASKET_X_M,
  BASKET_Y_M,
  COURT_LENGTH_M,
  COURT_WIDTH_M,
  RIM_RADIUS_M,
  backboardLine,
  centerCirclePath,
  freeThrowDashedArcPath,
  freeThrowSolidArcPath,
  keyRect,
  restrictedAreaPath,
  threePointLinePath,
  toCourtPoint,
} from "../../domain/court";

export interface ShotMarker {
  id: string;
  x: number;
  y: number;
  made: boolean;
}

interface FibaCourtSvgProps {
  markers: ShotMarker[];
}

const key = keyRect();
const backboard = backboardLine();

// Presentation attributes (not CSS classes) so a serialized SVG still looks
// like a court when rasterized for export — document stylesheets do not travel
// with XMLSerializer.
const SURFACE = "#b45309";
const LINE = "#fed7aa";
const RIM_FILL = "#fb923c";
const RIM_STROKE = "#78350f";
const MADE = "#22c55e";
const MISSED = "#ef4444";
const LINE_WIDTH = 0.08;
const MARKER_WIDTH = 0.12;

/** Renders an official-proportions FIBA half-court: sidelines, baseline,
 * half-court line and center circle, the key, free-throw circle, restricted
 * area and three-point line, plus made/missed shot markers. All dimensions
 * come from domain/court.ts so the geometry is unit-tested independently of
 * this render. */
export const FibaCourtSvg = forwardRef<SVGSVGElement, FibaCourtSvgProps>(function FibaCourtSvg(
  { markers },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${COURT_LENGTH_M} ${COURT_WIDTH_M}`}
      className="fiba-court"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x={0} y={0} width={COURT_LENGTH_M} height={COURT_WIDTH_M} className="court-surface" fill={SURFACE} />
      <rect
        x={0.05}
        y={0.05}
        width={COURT_LENGTH_M - 0.1}
        height={COURT_WIDTH_M - 0.1}
        className="court-line"
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_WIDTH}
      />
      <path d={centerCirclePath()} className="court-line" fill="none" stroke={LINE} strokeWidth={LINE_WIDTH} />
      <rect
        x={key.x}
        y={key.y}
        width={key.width}
        height={key.height}
        className="court-line"
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_WIDTH}
      />
      <path d={freeThrowSolidArcPath()} className="court-line" fill="none" stroke={LINE} strokeWidth={LINE_WIDTH} />
      <path
        d={freeThrowDashedArcPath()}
        className="court-line court-line-dashed"
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_WIDTH}
        strokeDasharray="0.3 0.22"
      />
      <path d={restrictedAreaPath()} className="court-line" fill="none" stroke={LINE} strokeWidth={LINE_WIDTH} />
      <path d={threePointLinePath()} className="court-line" fill="none" stroke={LINE} strokeWidth={LINE_WIDTH} />
      <line
        x1={backboard.x1}
        y1={backboard.y1}
        x2={backboard.x2}
        y2={backboard.y2}
        className="court-line"
        stroke={LINE}
        strokeWidth={0.1}
      />
      <circle
        cx={BASKET_X_M}
        cy={BASKET_Y_M}
        r={RIM_RADIUS_M}
        className="court-rim"
        fill={RIM_FILL}
        stroke={RIM_STROKE}
        strokeWidth={0.03}
      />

      {markers.map((marker) => {
        const point = toCourtPoint(marker.x, marker.y);
        return marker.made ? (
          <circle
            key={marker.id}
            cx={point.x}
            cy={point.y}
            r={0.28}
            className="shot-marker-made"
            fill="none"
            stroke={MADE}
            strokeWidth={MARKER_WIDTH}
          />
        ) : (
          <g key={marker.id} className="shot-marker-missed" stroke={MISSED} strokeWidth={MARKER_WIDTH}>
            <line x1={point.x - 0.25} y1={point.y - 0.25} x2={point.x + 0.25} y2={point.y + 0.25} />
            <line x1={point.x - 0.25} y1={point.y + 0.25} x2={point.x + 0.25} y2={point.y - 0.25} />
          </g>
        );
      })}
    </svg>
  );
});
