import Dexie, { type Table } from "dexie";

import type { ActionType, EventActor } from "../domain/actionTypes";

// Note: IndexedDB keys cannot be booleans, so flags below are never indexed —
// only `id`, `gameId` and the [gameId+seq] pair are.

export interface LocalGameEvent {
  id: string; // client-generated UUID: makes offline sync idempotent
  gameId: string;
  seq: number;
  period: number;
  gameClock: string | null;
  wallTime: string; // ISO 8601
  actor: EventActor;
  playerId: string | null;
  actionType: ActionType;
  x: number | null;
  y: number | null;
  meta: Record<string, unknown>;
  voided: boolean;
  syncedInsert: boolean;
  pendingVoidSync: boolean;
}

export interface CachedPlayer {
  id: string;
  teamId: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number;
  position: string;
}

export interface CachedRosterEntry {
  id: string;
  gameId: string;
  playerId: string;
  isStarter: boolean;
  dnp: boolean;
}

export interface CachedGame {
  id: string;
  orgId: string;
  homeTeamId: string;
  opponentName: string;
  gameDate: string;
  label: string | null;
  ruleset: string;
  status: string;
}

class BasketStatsDb extends Dexie {
  gameEvents!: Table<LocalGameEvent, string>;
  games!: Table<CachedGame, string>;
  players!: Table<CachedPlayer, string>;
  roster!: Table<CachedRosterEntry, string>;

  constructor() {
    super("basketstats");
    this.version(1).stores({
      gameEvents: "id, gameId, [gameId+seq]",
      games: "id",
      players: "id, teamId",
      roster: "id, gameId, playerId",
    });
  }
}

export const db = new BasketStatsDb();

/** Drop every local trace of a game once the server has accepted its deletion:
 * the journal, the cached game and its roster. Events that were never pushed go
 * too — without this the sync queue would retry them forever against a game
 * the server no longer knows about. */
export async function purgeLocalGame(gameId: string): Promise<void> {
  await db.transaction("rw", db.gameEvents, db.games, db.roster, async () => {
    await db.gameEvents.where("gameId").equals(gameId).delete();
    await db.roster.where("gameId").equals(gameId).delete();
    await db.games.delete(gameId);
  });
}
