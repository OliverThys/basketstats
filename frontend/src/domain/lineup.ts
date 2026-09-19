import { ActionType } from "./actionTypes";

export interface LineupEvent {
  actor: string;
  playerId: string | null;
  actionType: ActionType;
  period: number;
  seq: number;
  voided: boolean;
}

/** Who's currently on the court: starters at tip-off, then every SUB_IN/
 * SUB_OUT replayed in order. Pure and re-derivable from the event log, same
 * as the box score — never stored separately, so undoing a substitution
 * (like any other event) keeps this consistent automatically. */
export function computeOnCourtIds(
  starterIds: Iterable<string>,
  events: LineupEvent[],
): Set<string> {
  const onCourt = new Set(starterIds);
  const ordered = [...events]
    .filter((event) => !event.voided)
    .sort((a, b) => a.period - b.period || a.seq - b.seq);

  for (const event of ordered) {
    if (event.actor !== "home_player" || !event.playerId) continue;
    if (event.actionType === ActionType.SUB_IN) {
      onCourt.add(event.playerId);
    } else if (event.actionType === ActionType.SUB_OUT) {
      onCourt.delete(event.playerId);
    }
  }

  return onCourt;
}
