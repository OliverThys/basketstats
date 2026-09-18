import { ActionType } from "../../domain/actionTypes";
import type { LocalGameEvent } from "../../offline/db";

export const MADE_SHOT_ACTIONS = new Set<string>([ActionType.FG2_MADE, ActionType.FG3_MADE]);
export const SHOT_ACTIONS = new Set<string>([
  ActionType.FG2_MADE,
  ActionType.FG2_MISS,
  ActionType.FG3_MADE,
  ActionType.FG3_MISS,
]);

export interface ShotEntry {
  id: string;
  playerId: string;
  x: number;
  y: number;
  made: boolean;
  period: number;
}

export interface ShotChartFilters {
  selectedPlayerIds: ReadonlySet<string>;
  period: number | "all";
}

/** Pulls out only the shot events (made or missed FG2/FG3, with recorded
 * coordinates, not voided) as plain entries the shot chart can filter and
 * render without touching the wider event journal shape. */
export function extractShotEntries(events: LocalGameEvent[]): ShotEntry[] {
  return events
    .filter(
      (event) =>
        !event.voided &&
        SHOT_ACTIONS.has(event.actionType) &&
        event.x !== null &&
        event.y !== null &&
        event.playerId !== null,
    )
    .map((event) => ({
      id: event.id,
      playerId: event.playerId!,
      x: event.x!,
      y: event.y!,
      made: MADE_SHOT_ACTIONS.has(event.actionType),
      period: event.period,
    }));
}

export function filterShotEntries(entries: ShotEntry[], filters: ShotChartFilters): ShotEntry[] {
  return entries.filter((entry) => {
    if (!filters.selectedPlayerIds.has(entry.playerId)) return false;
    if (filters.period !== "all" && entry.period !== filters.period) return false;
    return true;
  });
}
