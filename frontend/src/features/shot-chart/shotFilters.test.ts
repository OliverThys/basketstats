import { describe, expect, it } from "vitest";

import { ActionType } from "../../domain/actionTypes";
import type { LocalGameEvent } from "../../offline/db";
import { extractShotEntries, filterShotEntries } from "./shotFilters";

function makeEvent(overrides: Partial<LocalGameEvent>): LocalGameEvent {
  return {
    id: "e1",
    gameId: "g1",
    seq: 1,
    period: 1,
    gameClock: null,
    wallTime: "2026-01-01T00:00:00Z",
    actor: "home_player",
    playerId: "p1",
    actionType: ActionType.FG2_MADE,
    x: 0.5,
    y: 0.5,
    meta: {},
    voided: false,
    syncedInsert: true,
    pendingVoidSync: false,
    ...overrides,
  };
}

describe("extractShotEntries", () => {
  it("keeps only made/missed FG2/FG3 events with recorded coordinates", () => {
    const events: LocalGameEvent[] = [
      makeEvent({ id: "shot", actionType: ActionType.FG3_MISS }),
      makeEvent({ id: "assist", actionType: ActionType.ASSIST, x: null, y: null }),
      makeEvent({ id: "no-coords", actionType: ActionType.FG2_MADE, x: null, y: null }),
      makeEvent({ id: "voided-shot", actionType: ActionType.FG2_MADE, voided: true }),
      makeEvent({ id: "opponent", actor: "opponent_team", playerId: null, actionType: ActionType.OPP_FG3_MADE }),
    ];
    const entries = extractShotEntries(events);
    expect(entries.map((e) => e.id)).toEqual(["shot"]);
    expect(entries[0].made).toBe(false);
  });

  it("marks FG2_MADE/FG3_MADE as made and misses as not made", () => {
    const events = [
      makeEvent({ id: "a", actionType: ActionType.FG2_MADE }),
      makeEvent({ id: "b", actionType: ActionType.FG3_MADE }),
      makeEvent({ id: "c", actionType: ActionType.FG2_MISS }),
      makeEvent({ id: "d", actionType: ActionType.FG3_MISS }),
    ];
    const entries = extractShotEntries(events);
    expect(entries.find((e) => e.id === "a")!.made).toBe(true);
    expect(entries.find((e) => e.id === "b")!.made).toBe(true);
    expect(entries.find((e) => e.id === "c")!.made).toBe(false);
    expect(entries.find((e) => e.id === "d")!.made).toBe(false);
  });
});

describe("filterShotEntries", () => {
  const entries = [
    { id: "1", playerId: "p1", x: 0.1, y: 0.1, made: true, period: 1 },
    { id: "2", playerId: "p2", x: 0.2, y: 0.2, made: false, period: 2 },
    { id: "3", playerId: "p1", x: 0.3, y: 0.3, made: true, period: 2 },
  ];

  it("filters by selected players", () => {
    const result = filterShotEntries(entries, { selectedPlayerIds: new Set(["p1"]), period: "all" });
    expect(result.map((e) => e.id)).toEqual(["1", "3"]);
  });

  it("filters by period", () => {
    const result = filterShotEntries(entries, { selectedPlayerIds: new Set(["p1", "p2"]), period: 2 });
    expect(result.map((e) => e.id)).toEqual(["2", "3"]);
  });

  it("combines both filters", () => {
    const result = filterShotEntries(entries, { selectedPlayerIds: new Set(["p1"]), period: 2 });
    expect(result.map((e) => e.id)).toEqual(["3"]);
  });

  it("returns everything when period is 'all' and every player is selected", () => {
    const result = filterShotEntries(entries, { selectedPlayerIds: new Set(["p1", "p2"]), period: "all" });
    expect(result).toHaveLength(3);
  });
});
