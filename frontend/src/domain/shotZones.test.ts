import { describe, expect, it } from "vitest";

import { ActionType } from "./actionTypes";
import {
  ZONE_ABOVE_BREAK_THREE,
  ZONE_AT_RIM,
  ZONE_CORNER_THREE,
  classifyShotZone,
  computeShotZones,
  zonePerGame,
} from "./shotZones";

describe("shot zones", () => {
  it("classifies FIBA spots", () => {
    expect(classifyShotZone(0.89, 0.5, false)).toBe(ZONE_AT_RIM);
    expect(classifyShotZone(0.95, 0.02, true)).toBe(ZONE_CORNER_THREE);
    expect(classifyShotZone(0.4, 0.5, true)).toBe(ZONE_ABOVE_BREAK_THREE);
  });

  it("aggregates total / percent / per game", () => {
    const report = computeShotZones(
      [
        { actionType: ActionType.FG2_MADE, actor: "home_player", playerId: "p", x: 0.89, y: 0.5 },
        { actionType: ActionType.FG2_MISS, actor: "home_player", playerId: "p", x: 0.89, y: 0.5 },
      ],
      2,
    );
    expect(report.zones[ZONE_AT_RIM].made).toBe(1);
    expect(report.zones[ZONE_AT_RIM].attempted).toBe(2);
    expect(zonePerGame(report.zones[ZONE_AT_RIM], 2)).toBe(1);
  });
});
