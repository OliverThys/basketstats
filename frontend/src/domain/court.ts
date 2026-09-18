// FIBA half-court geometry, in meters. The shot chart only ever needs the
// offensive half (baseline to center line), which is what a coach records
// shots against. All dimensions are official FIBA basketball court markings.
//
// Coordinate system: x runs from the half-court line (0) to the baseline
// (COURT_LENGTH_M); y runs sideline to sideline (0..COURT_WIDTH_M). This
// matches the landscape "hoop on the right" orientation used by the
// reference app. Normalized shot coordinates (0..1, as stored on GameEvent)
// map onto this rectangle via `toCourtPoint`.

export const COURT_LENGTH_M = 14; // half-court line to baseline
export const COURT_WIDTH_M = 15; // sideline to sideline
export const BASKET_TO_BASELINE_M = 1.575;
export const BASKET_X_M = COURT_LENGTH_M - BASKET_TO_BASELINE_M;
export const BASKET_Y_M = COURT_WIDTH_M / 2;
export const THREE_POINT_RADIUS_M = 6.75;
export const THREE_POINT_SIDELINE_GAP_M = 0.9;
export const KEY_WIDTH_M = 4.9;
export const KEY_LENGTH_M = 5.8;
export const FREE_THROW_RADIUS_M = 1.8;
export const RESTRICTED_AREA_RADIUS_M = 1.25;
export const CENTER_CIRCLE_RADIUS_M = 1.8;
export const RIM_RADIUS_M = 0.225;
export const BACKBOARD_FROM_BASELINE_M = 1.2;
export const BACKBOARD_WIDTH_M = 1.8;
/** Official FIBA corner 3-point distance: the line runs 0.9m from each
 * sideline, which puts it 6.60m from the basket, perpendicular to the sideline. */
export const THREE_POINT_CORNER_DISTANCE_M = BASKET_Y_M - THREE_POINT_SIDELINE_GAP_M;

export interface Point {
  x: number;
  y: number;
}

/** Normalized (0..1, 0..1) shot coordinates -> meters on the half-court rectangle. */
export function toCourtPoint(normalizedX: number, normalizedY: number): Point {
  return { x: normalizedX * COURT_LENGTH_M, y: normalizedY * COURT_WIDTH_M };
}

/** Samples points along a circular arc of radius `r` centered at (cx, cy),
 * bulging toward -x ("left", away from the baseline) or +x ("right", toward
 * it), for y running from yStart to yEnd. Plain trigonometry rather than SVG
 * arc-flag guesswork, so the geometry is easy to verify and unit test. */
export function arcPoints(
  cx: number,
  cy: number,
  r: number,
  yStart: number,
  yEnd: number,
  direction: -1 | 1,
  steps = 48,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = yStart + ((yEnd - yStart) * i) / steps;
    const dy = y - cy;
    const x = cx + direction * Math.sqrt(Math.max(r * r - dy * dy, 0));
    points.push({ x, y });
  }
  return points;
}

export function pointsToPath(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(" ");
}

/** Three-point line: two straight segments from the baseline out to the
 * corner (0.9m from each sideline), joined by the 6.75m arc around the
 * basket. */
export function threePointLinePath(): string {
  const archTopY = THREE_POINT_SIDELINE_GAP_M;
  const archBottomY = COURT_WIDTH_M - THREE_POINT_SIDELINE_GAP_M;
  const dy = BASKET_Y_M - archTopY;
  const cornerX = BASKET_X_M - Math.sqrt(THREE_POINT_RADIUS_M ** 2 - dy ** 2);
  const arc = arcPoints(BASKET_X_M, BASKET_Y_M, THREE_POINT_RADIUS_M, archTopY, archBottomY, -1);
  const points: Point[] = [
    { x: COURT_LENGTH_M, y: archTopY },
    { x: cornerX, y: archTopY },
    ...arc,
    { x: cornerX, y: archBottomY },
    { x: COURT_LENGTH_M, y: archBottomY },
  ];
  return pointsToPath(points);
}

/** No-charge semicircle under the basket, flat side facing the free-throw line. */
export function restrictedAreaPath(): string {
  const points = arcPoints(
    BASKET_X_M,
    BASKET_Y_M,
    RESTRICTED_AREA_RADIUS_M,
    BASKET_Y_M - RESTRICTED_AREA_RADIUS_M,
    BASKET_Y_M + RESTRICTED_AREA_RADIUS_M,
    -1,
  );
  return pointsToPath(points);
}

/** The visible half of the center circle, bulging into the half-court from
 * the half-court line (x=0). */
export function centerCirclePath(): string {
  const points = arcPoints(
    0,
    BASKET_Y_M,
    CENTER_CIRCLE_RADIUS_M,
    BASKET_Y_M - CENTER_CIRCLE_RADIUS_M,
    BASKET_Y_M + CENTER_CIRCLE_RADIUS_M,
    1,
  );
  return pointsToPath(points);
}

export function keyRect(): { x: number; y: number; width: number; height: number } {
  return {
    x: COURT_LENGTH_M - KEY_LENGTH_M,
    y: BASKET_Y_M - KEY_WIDTH_M / 2,
    width: KEY_LENGTH_M,
    height: KEY_WIDTH_M,
  };
}

export function freeThrowCircleCenter(): Point {
  return { x: COURT_LENGTH_M - KEY_LENGTH_M, y: BASKET_Y_M };
}

/** Face of the backboard, 1.20m in from the baseline, 1.80m wide. */
export function backboardLine(): { x1: number; y1: number; x2: number; y2: number } {
  const x = COURT_LENGTH_M - BACKBOARD_FROM_BASELINE_M;
  const half = BACKBOARD_WIDTH_M / 2;
  return { x1: x, y1: BASKET_Y_M - half, x2: x, y2: BASKET_Y_M + half };
}

/** Solid half of the free-throw circle (outside the key, toward half-court). */
export function freeThrowSolidArcPath(): string {
  const center = freeThrowCircleCenter();
  return pointsToPath(
    arcPoints(
      center.x,
      center.y,
      FREE_THROW_RADIUS_M,
      center.y - FREE_THROW_RADIUS_M,
      center.y + FREE_THROW_RADIUS_M,
      -1,
    ),
  );
}

/** Dashed half of the free-throw circle (inside the key, toward the basket). */
export function freeThrowDashedArcPath(): string {
  const center = freeThrowCircleCenter();
  return pointsToPath(
    arcPoints(
      center.x,
      center.y,
      FREE_THROW_RADIUS_M,
      center.y - FREE_THROW_RADIUS_M,
      center.y + FREE_THROW_RADIUS_M,
      1,
    ),
  );
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Inverse of `toCourtPoint`: meters on the half-court -> normalized 0..1. */
export function toNormalizedPoint(courtX: number, courtY: number): Point {
  return { x: clamp01(courtX / COURT_LENGTH_M), y: clamp01(courtY / COURT_WIDTH_M) };
}
