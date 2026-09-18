import { useCallback, useEffect, useState } from "react";

import { fetchGame, fetchGameRoster } from "../../api/games";
import { fetchTeamPlayers } from "../../api/players";
import type { ActionType, EventActor } from "../../domain/actionTypes";
import { db, type CachedGame, type CachedPlayer, type CachedRosterEntry, type LocalGameEvent } from "../../offline/db";
import { pendingEventCount, syncGame, type SyncStatus } from "../../offline/sync";
import { useLiveQuery } from "../../offline/useLiveQuery";

interface RecordEventInput {
  actor: EventActor;
  actionType: ActionType;
  playerId: string | null;
  period: number;
  x?: number | null;
  y?: number | null;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function nextSeq(gameId: string): Promise<number> {
  const events = await db.gameEvents.where("gameId").equals(gameId).toArray();
  return events.reduce((max, event) => Math.max(max, event.seq), 0) + 1;
}

/** Loads a game + its roster once (API when online, Dexie cache otherwise so a
 * reload mid-game in airplane mode never loses setup data), then exposes the
 * local event journal plus recording/void/sync operations. Every write goes
 * to IndexedDB first and updates the UI via useLiveQuery; syncing to the API
 * is a separate, retryable step. */
export function useLiveGame(gameId: string) {
  const [game, setGame] = useState<CachedGame | null>(null);
  const [players, setPlayers] = useState<CachedPlayer[]>([]);
  const [roster, setRoster] = useState<CachedRosterEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [apiGame, apiRoster] = await Promise.all([fetchGame(gameId), fetchGameRoster(gameId)]);
        const apiPlayers = await fetchTeamPlayers(apiGame.homeTeamId);
        if (cancelled) return;
        await db.games.put(apiGame);
        await db.roster.bulkPut(apiRoster);
        await db.players.bulkPut(apiPlayers);
        setGame(apiGame);
        setRoster(apiRoster);
        setPlayers(apiPlayers);
      } catch {
        if (cancelled) return;
        const [cachedGame, cachedRoster] = await Promise.all([
          db.games.get(gameId),
          db.roster.where("gameId").equals(gameId).toArray(),
        ]);
        if (!cachedGame) {
          setLoadError("This game has never been loaded on this device and there is no network connection.");
          return;
        }
        const cachedPlayers = await db.players.where("teamId").equals(cachedGame.homeTeamId).toArray();
        setGame(cachedGame);
        setRoster(cachedRoster);
        setPlayers(cachedPlayers);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const events = useLiveQuery(
    () => db.gameEvents.where("gameId").equals(gameId).sortBy("seq"),
    [gameId],
    [] as LocalGameEvent[],
  );

  const refreshSyncStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
      return;
    }
    const pending = await pendingEventCount(gameId);
    setSyncStatus(pending > 0 ? "pending" : "synced");
  }, [gameId]);

  const attemptSync = useCallback(async () => {
    try {
      await syncGame(gameId);
    } catch {
      // stays pending, retried on the next tick
    }
    await refreshSyncStatus();
  }, [gameId, refreshSyncStatus]);

  useEffect(() => {
    void attemptSync();
    const interval = setInterval(() => void attemptSync(), 4000);
    window.addEventListener("online", () => void attemptSync());
    window.addEventListener("offline", () => void refreshSyncStatus());
    return () => {
      clearInterval(interval);
    };
  }, [attemptSync, refreshSyncStatus]);

  const recordEvent = useCallback(
    async (input: RecordEventInput) => {
      const seq = await nextSeq(gameId);
      const event: LocalGameEvent = {
        id: crypto.randomUUID(),
        gameId,
        seq,
        period: input.period,
        gameClock: null,
        wallTime: nowIso(),
        actor: input.actor,
        playerId: input.playerId,
        actionType: input.actionType,
        x: input.x ?? null,
        y: input.y ?? null,
        meta: {},
        voided: false,
        syncedInsert: false,
        pendingVoidSync: false,
      };
      await db.gameEvents.add(event);
      void attemptSync();
    },
    [gameId, attemptSync],
  );

  const voidEvent = useCallback(
    async (eventId: string) => {
      const event = await db.gameEvents.get(eventId);
      if (!event) return;
      await db.gameEvents.update(eventId, {
        voided: true,
        pendingVoidSync: event.syncedInsert,
      });
      void attemptSync();
    },
    [attemptSync],
  );

  const undoLast = useCallback(async () => {
    const last = [...events].filter((event) => !event.voided).sort((a, b) => b.seq - a.seq)[0];
    if (last) {
      await voidEvent(last.id);
    }
  }, [events, voidEvent]);

  return {
    game,
    players,
    roster,
    events,
    loadError,
    syncStatus,
    recordEvent,
    voidEvent,
    undoLast,
  };
}
