import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGame, fetchGameRoster } from "../../api/games";
import { fetchTeamPlayers } from "../../api/players";
import type { ActionType, EventActor } from "../../domain/actionTypes";
import { hydrateEventsFromServer } from "../../offline/hydrate";
import { db, type CachedGame, type CachedPlayer, type CachedRosterEntry, type LocalGameEvent } from "../../offline/db";
import { withRecordLock } from "../../offline/recordLock";
import { startSyncLoop, type SyncLoop, type SyncStatus } from "../../offline/sync";
import { useLiveQuery } from "../../offline/useLiveQuery";
import { generateEventId } from "../../offline/uuid";

interface RecordEventInput {
  actor: EventActor;
  actionType: ActionType;
  playerId: string | null;
  period: number;
  gameClock?: string | null;
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
  const syncLoopRef = useRef<SyncLoop | null>(null);

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
        try {
          await hydrateEventsFromServer(gameId);
        } catch {
          // Local journal is enough to keep scoring; hydrate is best-effort.
        }
        if (cancelled) return;
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

  useEffect(() => {
    const loop = startSyncLoop(gameId, setSyncStatus);
    syncLoopRef.current = loop;
    return () => {
      loop.stop();
      syncLoopRef.current = null;
    };
  }, [gameId]);

  /** Appends events to the local journal under a single lock, so a group that
   * only makes sense together (a SUB_OUT/SUB_IN pair) can never be half
   * written — a dangling SUB_OUT would corrupt the derived lineup, and with it
   * every player's minutes and +/-. */
  const recordEvents = useCallback(async (inputs: RecordEventInput[]) => {
    if (inputs.length === 0) return;
    await withRecordLock(gameId, async () => {
      const firstSeq = await nextSeq(gameId);
      const rows: LocalGameEvent[] = inputs.map((input, index) => ({
        id: generateEventId(),
        gameId,
        seq: firstSeq + index,
        period: input.period,
        gameClock: input.gameClock ?? null,
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
      }));
      await db.gameEvents.bulkAdd(rows);
    });
    syncLoopRef.current?.kick();
  }, [gameId]);

  const recordEvent = useCallback(
    async (input: RecordEventInput) => {
      await recordEvents([input]);
    },
    [recordEvents],
  );

  const voidEvent = useCallback(async (eventId: string) => {
    const event = await db.gameEvents.get(eventId);
    if (!event) return;
    await db.gameEvents.update(eventId, {
      voided: true,
      pendingVoidSync: event.syncedInsert,
    });
    syncLoopRef.current?.kick();
  }, []);

  /** Reads the journal back from IndexedDB rather than trusting the rendered
   * snapshot: undo has to hit the genuinely last event even if a write from the
   * tap before it only just landed. */
  const undoLast = useCallback(async () => {
    const stored = await db.gameEvents.where("gameId").equals(gameId).toArray();
    const last = stored.filter((event) => !event.voided).sort((a, b) => b.seq - a.seq)[0];
    if (last) {
      await voidEvent(last.id);
    }
  }, [gameId, voidEvent]);

  return {
    game,
    players,
    roster,
    events,
    loadError,
    syncStatus,
    recordEvent,
    recordEvents,
    voidEvent,
    undoLast,
  };
}
