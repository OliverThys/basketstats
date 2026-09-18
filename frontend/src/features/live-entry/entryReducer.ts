import { isShotAction } from "../../domain/actionTypes";
import type { ActionType } from "../../domain/actionTypes";

export interface PendingShot {
  action: ActionType;
  playerId: string;
}

export interface EntryState {
  selectedAction: ActionType | null;
  selectedPlayerId: string | null;
  pendingShot: PendingShot | null;
}

export const initialEntryState: EntryState = {
  selectedAction: null,
  selectedPlayerId: null,
  pendingShot: null,
};

export type EntryCommand =
  | { type: "SELECT_ACTION"; action: ActionType }
  | { type: "SELECT_PLAYER"; playerId: string }
  | { type: "RESET" };

/** Two-step, order-independent capture: pick a player or a stat first, the
 * other second. A shot action (FG2/FG3) needs court coordinates, so picking
 * both a shot action and a player parks the pair in `pendingShot` instead of
 * completing immediately. */
export function entryReducer(state: EntryState, command: EntryCommand): EntryState {
  switch (command.type) {
    case "SELECT_ACTION": {
      if (state.selectedPlayerId && isShotAction(command.action)) {
        return {
          selectedAction: null,
          selectedPlayerId: null,
          pendingShot: { action: command.action, playerId: state.selectedPlayerId },
        };
      }
      return { ...state, selectedAction: command.action };
    }
    case "SELECT_PLAYER": {
      if (state.selectedAction && isShotAction(state.selectedAction)) {
        return {
          selectedAction: null,
          selectedPlayerId: null,
          pendingShot: { action: state.selectedAction, playerId: command.playerId },
        };
      }
      return { ...state, selectedPlayerId: command.playerId };
    }
    case "RESET":
      return initialEntryState;
    default:
      return state;
  }
}

/** True once a non-shot action and a player are both selected: the caller
 * should record the event immediately and reset. */
export function isReadyForImmediateEvent(state: EntryState): state is EntryState & {
  selectedAction: ActionType;
  selectedPlayerId: string;
} {
  return (
    state.selectedAction !== null &&
    state.selectedPlayerId !== null &&
    !isShotAction(state.selectedAction)
  );
}
