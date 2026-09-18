import { apiFetch } from "./http";
import type { LocalGameEvent } from "../offline/db";

interface GameEventApiPayload {
  id: string;
  seq: number;
  period: number;
  game_clock: string | null;
  wall_time: string;
  actor: string;
  player_id: string | null;
  action_type: string;
  x: number | null;
  y: number | null;
  meta: Record<string, unknown>;
  voided: boolean;
}

interface GameEventBatchResult {
  inserted: number;
  skipped_existing: number;
}

function toApiPayload(event: LocalGameEvent): GameEventApiPayload {
  return {
    id: event.id,
    seq: event.seq,
    period: event.period,
    game_clock: event.gameClock,
    wall_time: event.wallTime,
    actor: event.actor,
    player_id: event.playerId,
    action_type: event.actionType,
    x: event.x,
    y: event.y,
    meta: event.meta,
    voided: event.voided,
  };
}

export async function pushEventsBatch(
  gameId: string,
  events: LocalGameEvent[],
): Promise<GameEventBatchResult> {
  return apiFetch<GameEventBatchResult>(`/games/${gameId}/events/batch`, {
    method: "POST",
    body: JSON.stringify({ events: events.map(toApiPayload) }),
  });
}

export async function voidEventOnServer(gameId: string, eventId: string): Promise<void> {
  await apiFetch<void>(`/games/${gameId}/events/${eventId}`, { method: "DELETE" });
}

interface GameEventApiRead extends GameEventApiPayload {
  game_id: string;
}

export async function fetchGameEvents(
  gameId: string,
  includeVoided = false,
): Promise<LocalGameEvent[]> {
  const query = includeVoided ? "?include_voided=true" : "";
  const events = await apiFetch<GameEventApiRead[]>(`/games/${gameId}/events${query}`);
  return events.map((event) => ({
    id: event.id,
    gameId: event.game_id,
    seq: event.seq,
    period: event.period,
    gameClock: event.game_clock,
    wallTime: event.wall_time,
    actor: event.actor as LocalGameEvent["actor"],
    playerId: event.player_id,
    actionType: event.action_type as LocalGameEvent["actionType"],
    x: event.x,
    y: event.y,
    meta: event.meta,
    voided: event.voided,
    syncedInsert: true,
    pendingVoidSync: false,
  }));
}
