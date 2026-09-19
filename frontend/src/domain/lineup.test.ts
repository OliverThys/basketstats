import { describe, expect, it } from "vitest";

import { ActionType } from "./actionTypes";
import { computeOnCourtIds, type LineupEvent } from "./lineup";

function ev(overrides: Partial<LineupEvent>): LineupEvent {
  return {
    actor: "home_player",
    playerId: "p1",
    actionType: ActionType.SUB_IN,
    period: 1,
    seq: 0,
    voided: false,
    ...overrides,
  };
}

describe("computeOnCourtIds", () => {
  it("starts from the starters", () => {
    const onCourt = computeOnCourtIds(["p1", "p2"], []);
    expect(onCourt).toEqual(new Set(["p1", "p2"]));
  });

  it("applies SUB_OUT / SUB_IN in order", () => {
    const events = [
      ev({ playerId: "p1", actionType: ActionType.SUB_OUT, seq: 1 }),
      ev({ playerId: "p3", actionType: ActionType.SUB_IN, seq: 2 }),
    ];
    const onCourt = computeOnCourtIds(["p1", "p2"], events);
    expect(onCourt).toEqual(new Set(["p2", "p3"]));
  });

  it("ignores voided substitutions", () => {
    const events = [ev({ playerId: "p1", actionType: ActionType.SUB_OUT, voided: true })];
    const onCourt = computeOnCourtIds(["p1"], events);
    expect(onCourt).toEqual(new Set(["p1"]));
  });

  it("orders by period then seq, not array order", () => {
    const events = [
      ev({ playerId: "p3", actionType: ActionType.SUB_IN, period: 2, seq: 1 }),
      ev({ playerId: "p1", actionType: ActionType.SUB_OUT, period: 1, seq: 5 }),
    ];
    const onCourt = computeOnCourtIds(["p1"], events);
    expect(onCourt).toEqual(new Set(["p3"]));
  });
});
