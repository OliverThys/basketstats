import { describe, expect, it } from "vitest";

import { ActionType } from "./actionTypes";
import { computeBoxScore, type GameEventRecord } from "./boxScore";
import {
  buildReferenceGameEvents,
  EXPECTED_HOME_SCORE,
  EXPECTED_TOTALS,
  REFERENCE_GAME_PLAYERS,
} from "./referenceGame.fixture";

describe("computeBoxScore", () => {
  it("matches the known reference game box score", () => {
    const boxScore = computeBoxScore(buildReferenceGameEvents());

    expect(boxScore.homeScore).toBe(EXPECTED_HOME_SCORE);
    expect(boxScore.players.size).toBe(REFERENCE_GAME_PLAYERS.length);

    for (const fixture of REFERENCE_GAME_PLAYERS) {
      const row = boxScore.players.get(fixture.playerId)!;
      expect(row.fg2m).toBe(fixture.fg2m);
      expect(row.fg2a).toBe(fixture.fg2a);
      expect(row.fg3m).toBe(fixture.fg3m);
      expect(row.fg3a).toBe(fixture.fg3a);
      expect(row.fgm).toBe(fixture.fg2m + fixture.fg3m);
      expect(row.fga).toBe(fixture.fg2a + fixture.fg3a);
      expect(row.ftm).toBe(fixture.ftm);
      expect(row.fta).toBe(fixture.fta);
      expect(row.rebOff).toBe(fixture.rebOff);
      expect(row.rebDef).toBe(fixture.rebDef);
      expect(row.rebTot).toBe(fixture.rebOff + fixture.rebDef);
      expect(row.ast).toBe(fixture.ast);
      expect(row.stl).toBe(fixture.stl);
      expect(row.tov).toBe(fixture.tov);
      expect(row.blk).toBe(fixture.blk);
      expect(row.pf).toBe(fixture.pf);
      expect(row.fpf).toBe(fixture.fpf);
      expect(row.pts).toBe(fixture.expectedPts);
      expect(row.eff).toBe(fixture.expectedEff);
    }

    const { totals } = boxScore;
    expect(totals.fg2m).toBe(EXPECTED_TOTALS.fg2m);
    expect(totals.fg2a).toBe(EXPECTED_TOTALS.fg2a);
    expect(totals.fg3m).toBe(EXPECTED_TOTALS.fg3m);
    expect(totals.fg3a).toBe(EXPECTED_TOTALS.fg3a);
    expect(totals.fgm).toBe(EXPECTED_TOTALS.fgm);
    expect(totals.fga).toBe(EXPECTED_TOTALS.fga);
    expect(totals.ftm).toBe(EXPECTED_TOTALS.ftm);
    expect(totals.fta).toBe(EXPECTED_TOTALS.fta);
    expect(totals.rebOff).toBe(EXPECTED_TOTALS.rebOff);
    expect(totals.rebDef).toBe(EXPECTED_TOTALS.rebDef);
    expect(totals.rebTot).toBe(EXPECTED_TOTALS.rebTot);
    expect(totals.ast).toBe(EXPECTED_TOTALS.ast);
    expect(totals.stl).toBe(EXPECTED_TOTALS.stl);
    expect(totals.tov).toBe(EXPECTED_TOTALS.tov);
    expect(totals.blk).toBe(EXPECTED_TOTALS.blk);
    expect(totals.pf).toBe(EXPECTED_TOTALS.pf);
    expect(totals.fpf).toBe(EXPECTED_TOTALS.fpf);
    expect(totals.pts).toBe(EXPECTED_TOTALS.pts);
    expect(totals.eff).toBe(EXPECTED_TOTALS.eff);

    expect(totals.fgPct).toBeCloseTo(29 / 63);
    expect(totals.fg2Pct).toBeCloseTo(21 / 43);
    expect(totals.fg3Pct).toBeCloseTo(8 / 20);
    expect(totals.ftPct).toBeCloseTo(16 / 22);
    expect(Math.round(totals.fgPct * 1000) / 10).toBe(46.0);
    expect(Math.round(totals.fg2Pct * 1000) / 10).toBe(48.8);
    expect(Math.round(totals.fg3Pct * 1000) / 10).toBe(40.0);
    expect(Math.round(totals.ftPct * 1000) / 10).toBe(72.7);
  });

  it("matches the EFF control case from the brief (21/11/8/5/0, FG 6-10, FT 7-10, 3 TO -> EFF 35)", () => {
    const events: GameEventRecord[] = [
      ...Array.from({ length: 4 }, () => ({ actionType: ActionType.FG2_MADE, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 3 }, () => ({ actionType: ActionType.FG2_MISS, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 2 }, () => ({ actionType: ActionType.FG3_MADE, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 1 }, () => ({ actionType: ActionType.FG3_MISS, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 7 }, () => ({ actionType: ActionType.FT_MADE, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 3 }, () => ({ actionType: ActionType.FT_MISS, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 3 }, () => ({ actionType: ActionType.REB_OFF, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 8 }, () => ({ actionType: ActionType.REB_DEF, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 8 }, () => ({ actionType: ActionType.ASSIST, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 5 }, () => ({ actionType: ActionType.STEAL, actor: "home_player" as const, playerId: "p" })),
      ...Array.from({ length: 3 }, () => ({ actionType: ActionType.TURNOVER, actor: "home_player" as const, playerId: "p" })),
    ];
    const row = computeBoxScore(events).players.get("p")!;
    expect(row.pts).toBe(21);
    expect(row.rebTot).toBe(11);
    expect(row.eff).toBe(35);
    expect(row.efgPct).toBeCloseTo(0.7);
    expect(row.tsPct).toBeCloseTo(21 / (2 * (10 + 0.44 * 10)));
  });

  it("only lets opponent events affect the opponent score", () => {
    const events: GameEventRecord[] = [
      { actionType: ActionType.OPP_FT_MADE, actor: "opponent_team" },
      { actionType: ActionType.OPP_FG2_MADE, actor: "opponent_team" },
      { actionType: ActionType.OPP_FG3_MADE, actor: "opponent_team" },
      { actionType: ActionType.OPP_FOUL, actor: "opponent_team" },
    ];
    const boxScore = computeBoxScore(events);
    expect(boxScore.opponentScore).toBe(1 + 2 + 3);
    expect(boxScore.homeScore).toBe(0);
    expect(boxScore.players.size).toBe(0);
  });

  it("excludes voided events", () => {
    const events: GameEventRecord[] = [
      { actionType: ActionType.FG3_MADE, actor: "home_player", playerId: "p" },
      { actionType: ActionType.FG3_MADE, actor: "home_player", playerId: "p", voided: true },
    ];
    const row = computeBoxScore(events).players.get("p")!;
    expect(row.fg3m).toBe(1);
    expect(row.pts).toBe(3);
  });

  it("throws when a home_player event is missing a playerId", () => {
    const events: GameEventRecord[] = [{ actionType: ActionType.FG2_MADE, actor: "home_player", playerId: null }];
    expect(() => computeBoxScore(events)).toThrow(/missing playerId/);
  });
});
