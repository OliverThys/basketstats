import { describe, expect, it } from "vitest";

import { ActionType } from "../../domain/actionTypes";
import { entryReducer, initialEntryState, isReadyForImmediateEvent } from "./entryReducer";

describe("entryReducer", () => {
  it("selects a non-shot action then a player and becomes ready for an immediate event", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_ACTION", action: ActionType.ASSIST });
    expect(isReadyForImmediateEvent(state)).toBe(false);

    state = entryReducer(state, { type: "SELECT_PLAYER", playerId: "p1" });
    expect(isReadyForImmediateEvent(state)).toBe(true);
    if (isReadyForImmediateEvent(state)) {
      expect(state.selectedAction).toBe(ActionType.ASSIST);
      expect(state.selectedPlayerId).toBe("p1");
    }
  });

  it("selects a player then a non-shot action in the opposite order with the same result", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_PLAYER", playerId: "p1" });
    state = entryReducer(state, { type: "SELECT_ACTION", action: ActionType.STEAL });
    expect(isReadyForImmediateEvent(state)).toBe(true);
  });

  it("parks a shot action + player pair as pendingShot instead of completing immediately", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_ACTION", action: ActionType.FG3_MADE });
    state = entryReducer(state, { type: "SELECT_PLAYER", playerId: "p7" });
    expect(isReadyForImmediateEvent(state)).toBe(false);
    expect(state.pendingShot).toEqual({ action: ActionType.FG3_MADE, playerId: "p7" });
    expect(state.selectedAction).toBeNull();
    expect(state.selectedPlayerId).toBeNull();
  });

  it("parks a shot pair regardless of selection order", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_PLAYER", playerId: "p9" });
    state = entryReducer(state, { type: "SELECT_ACTION", action: ActionType.FG2_MISS });
    expect(state.pendingShot).toEqual({ action: ActionType.FG2_MISS, playerId: "p9" });
  });

  it("re-selecting an action or player before completion overwrites the previous choice", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_ACTION", action: ActionType.STEAL });
    state = entryReducer(state, { type: "SELECT_ACTION", action: ActionType.BLOCK });
    expect(state.selectedAction).toBe(ActionType.BLOCK);
  });

  it("resets to the initial state", () => {
    let state = entryReducer(initialEntryState, { type: "SELECT_ACTION", action: ActionType.STEAL });
    state = entryReducer(state, { type: "RESET" });
    expect(state).toEqual(initialEntryState);
  });
});
