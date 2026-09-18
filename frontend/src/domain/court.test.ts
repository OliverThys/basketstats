import { describe, expect, it } from "vitest";

import {
  arcPoints,
  backboardLine,
  BASKET_TO_BASELINE_M,
  BASKET_X_M,
  BASKET_Y_M,
  BACKBOARD_FROM_BASELINE_M,
  BACKBOARD_WIDTH_M,
  COURT_LENGTH_M,
  COURT_WIDTH_M,
  RESTRICTED_AREA_RADIUS_M,
  THREE_POINT_CORNER_DISTANCE_M,
  THREE_POINT_RADIUS_M,
  THREE_POINT_SIDELINE_GAP_M,
  clamp01,
  restrictedAreaPath,
  threePointLinePath,
  toCourtPoint,
  toNormalizedPoint,
} from "./court";

describe("toCourtPoint", () => {
  it("maps normalized shot coordinates onto the half-court rectangle in meters", () => {
    expect(toCourtPoint(0, 0)).toEqual({ x: 0, y: 0 });
    expect(toCourtPoint(1, 1)).toEqual({ x: COURT_LENGTH_M, y: COURT_WIDTH_M });
    expect(toCourtPoint(0.5, 0.5)).toEqual({ x: COURT_LENGTH_M / 2, y: COURT_WIDTH_M / 2 });
  });
});

describe("toNormalizedPoint", () => {
  it("is the inverse of toCourtPoint and clamps to 0..1", () => {
    expect(toNormalizedPoint(0, 0)).toEqual({ x: 0, y: 0 });
    expect(toNormalizedPoint(COURT_LENGTH_M, COURT_WIDTH_M)).toEqual({ x: 1, y: 1 });
    expect(toNormalizedPoint(-1, 100)).toEqual({ x: 0, y: 1 });
    expect(clamp01(0.4)).toBe(0.4);
  });
});

describe("FIBA official distances", () => {
  it("places the basket 1.575m in from the baseline", () => {
    expect(COURT_LENGTH_M - BASKET_X_M).toBeCloseTo(BASKET_TO_BASELINE_M, 5);
  });

  it("places the corner 3-point line 6.60m from the basket", () => {
    expect(THREE_POINT_CORNER_DISTANCE_M).toBeCloseTo(6.6, 5);
    expect(BASKET_Y_M - THREE_POINT_SIDELINE_GAP_M).toBeCloseTo(6.6, 5);
  });
});

describe("backboardLine", () => {
  it("is 1.80m wide and 1.20m in from the baseline", () => {
    const line = backboardLine();
    expect(COURT_LENGTH_M - line.x1).toBeCloseTo(BACKBOARD_FROM_BASELINE_M, 5);
    expect(line.x1).toBe(line.x2);
    expect(line.y2 - line.y1).toBeCloseTo(BACKBOARD_WIDTH_M, 5);
  });
});

describe("arcPoints", () => {
  it("stays exactly r away from the center at every sampled point", () => {
    const points = arcPoints(10, 5, 3, 2, 8, -1, 16);
    for (const point of points) {
      const distance = Math.hypot(point.x - 10, point.y - 5);
      expect(distance).toBeCloseTo(3, 6);
    }
  });

  it("bulges toward -x when direction is -1 and toward +x when +1", () => {
    const left = arcPoints(10, 5, 3, 5, 5, -1, 1)[0];
    const right = arcPoints(10, 5, 3, 5, 5, 1, 1)[0];
    expect(left.x).toBeLessThan(10);
    expect(right.x).toBeGreaterThan(10);
  });
});

describe("threePointLinePath", () => {
  it("starts and ends exactly at the baseline, 0.9m from each sideline", () => {
    const path = threePointLinePath();
    expect(path).toMatch(new RegExp(`^M ${COURT_LENGTH_M.toFixed(3)} ${THREE_POINT_SIDELINE_GAP_M.toFixed(3)}`));
    expect(path.trim().endsWith(`L ${COURT_LENGTH_M.toFixed(3)} ${(COURT_WIDTH_M - THREE_POINT_SIDELINE_GAP_M).toFixed(3)}`)).toBe(true);
  });

  it("stays exactly THREE_POINT_RADIUS_M from the basket along the arc segment", () => {
    // The 2nd path command ("L cornerX cornerY") is where the straight segment meets the arc.
    const tokens = threePointLinePath().split(" ");
    const cornerX = Number(tokens[4]);
    const cornerY = Number(tokens[5]);
    const distance = Math.hypot(cornerX - BASKET_X_M, cornerY - BASKET_Y_M);
    expect(distance).toBeCloseTo(THREE_POINT_RADIUS_M, 2);
  });
});

describe("restrictedAreaPath", () => {
  it("is a semicircle of the restricted-area radius centered on the basket", () => {
    const points = restrictedAreaPath()
      .split(/(?=[ML])/)
      .map((segment) => segment.trim().split(" ").slice(1).map(Number))
      .map(([x, y]) => ({ x, y }));
    for (const point of points) {
      expect(Math.hypot(point.x - BASKET_X_M, point.y - BASKET_Y_M)).toBeCloseTo(RESTRICTED_AREA_RADIUS_M, 2);
    }
  });
});
