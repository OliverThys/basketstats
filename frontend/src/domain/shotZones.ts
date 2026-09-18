import {
  BASKET_X_M,
  BASKET_Y_M,
  COURT_LENGTH_M,
  COURT_WIDTH_M,
  KEY_LENGTH_M,
  KEY_WIDTH_M,
  RESTRICTED_AREA_RADIUS_M,
  THREE_POINT_SIDELINE_GAP_M,
} from "./court";
import { ActionType } from "./actionTypes";
import type { GameEventRecord } from "./boxScore";

export const ZONE_AT_RIM = "at_rim";
export const ZONE_PAINT = "paint";
export const ZONE_MID_RANGE = "mid_range";
export const ZONE_CORNER_THREE = "corner_three";
export const ZONE_ABOVE_BREAK_THREE = "above_break_three";

export const SHOT_ZONES = [
  ZONE_AT_RIM,
  ZONE_PAINT,
  ZONE_MID_RANGE,
  ZONE_CORNER_THREE,
  ZONE_ABOVE_BREAK_THREE,
] as const;

export type ShotZone = (typeof SHOT_ZONES)[number];

const MADE = new Set<string>([ActionType.FG2_MADE, ActionType.FG3_MADE]);
const SHOTS = new Set<string>([
  ActionType.FG2_MADE,
  ActionType.FG2_MISS,
  ActionType.FG3_MADE,
  ActionType.FG3_MISS,
]);
const THREES = new Set<string>([ActionType.FG3_MADE, ActionType.FG3_MISS]);

export interface ZoneLine {
  zone: ShotZone;
  made: number;
  attempted: number;
}

export function zonePct(line: ZoneLine): number {
  return line.attempted ? line.made / line.attempted : 0;
}

export function zonePerGame(line: ZoneLine, games: number): number {
  return games ? line.attempted / games : 0;
}

export interface ShotZoneReport {
  zones: Record<ShotZone, ZoneLine>;
  games: number;
}

export function classifyShotZone(normalizedX: number, normalizedY: number, isThree: boolean): ShotZone {
  const x = normalizedX * COURT_LENGTH_M;
  const y = normalizedY * COURT_WIDTH_M;
  const dist = Math.hypot(x - BASKET_X_M, y - BASKET_Y_M);
  const inKey = x >= COURT_LENGTH_M - KEY_LENGTH_M && Math.abs(y - BASKET_Y_M) <= KEY_WIDTH_M / 2;
  if (isThree) {
    if (y <= THREE_POINT_SIDELINE_GAP_M || y >= COURT_WIDTH_M - THREE_POINT_SIDELINE_GAP_M) {
      return ZONE_CORNER_THREE;
    }
    return ZONE_ABOVE_BREAK_THREE;
  }
  if (dist <= RESTRICTED_AREA_RADIUS_M) return ZONE_AT_RIM;
  if (inKey) return ZONE_PAINT;
  return ZONE_MID_RANGE;
}

function emptyReport(games: number): ShotZoneReport {
  const zones = {} as Record<ShotZone, ZoneLine>;
  for (const zone of SHOT_ZONES) zones[zone] = { zone, made: 0, attempted: 0 };
  return { zones, games };
}

export function computeShotZones(events: GameEventRecord[], games = 1): ShotZoneReport {
  const report = emptyReport(games);
  for (const event of events) {
    if (event.voided || event.actor !== "home_player") continue;
    if (!SHOTS.has(event.actionType) || event.x == null || event.y == null) continue;
    const zone = classifyShotZone(event.x, event.y, THREES.has(event.actionType));
    report.zones[zone].attempted += 1;
    if (MADE.has(event.actionType)) report.zones[zone].made += 1;
  }
  return report;
}
