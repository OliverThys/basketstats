import { describe, expect, it } from "vitest";

import { ActionType } from "./actionTypes";
import { computeSeasonStats, efgPct } from "./seasonStats";

describe("computeSeasonStats", () => {
  it("excludes DNP games from per-game averages", () => {
    const report = computeSeasonStats([
      {
        opponentName: "Opp A",
        events: Array.from({ length: 5 }, () => ({
          actionType: ActionType.FG2_MADE,
          actor: "home_player" as const,
          playerId: "p1",
        })),
        roster: [{ playerId: "p1", isStarter: true, dnp: false }],
      },
      {
        opponentName: "Opp B",
        events: Array.from({ length: 10 }, () => ({
          actionType: ActionType.FG2_MADE,
          actor: "home_player" as const,
          playerId: "p1",
        })),
        roster: [{ playerId: "p1", isStarter: true, dnp: false }],
      },
      {
        opponentName: "Opp A",
        events: Array.from({ length: 8 }, () => ({
          actionType: ActionType.FG2_MADE,
          actor: "home_player" as const,
          playerId: "p1",
        })),
        roster: [{ playerId: "p1", isStarter: false, dnp: true }],
      },
    ]);
    const stats = report.players.p1;
    expect(stats.totals.gamesPlayed).toBe(2);
    expect(stats.totals.pts).toBe(30);
    expect(stats.totals.pts / stats.totals.gamesPlayed).toBe(15);
    expect(stats.byOpponent["Opp A"].gamesPlayed).toBe(1);
    expect(stats.byOpponent["Opp A"].pts).toBe(10);
    expect(efgPct(stats.totals)).toBe(1);
  });
});
