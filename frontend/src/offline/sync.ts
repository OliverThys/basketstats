import { pushEventsBatch, voidEventOnServer } from "../api/gameEvents";
import { db } from "./db";

export type SyncStatus = "synced" | "pending" | "offline";

const locks = new Map<string, Promise<unknown>>();

function withGameLock<T>(gameId: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(gameId) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    gameId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

/** Pushes locally-recorded events for a game to the API. Safe to call
 * repeatedly and concurrently: the per-game lock serializes runs, and the
 * batch insert is idempotent server-side on the event UUID. */
export async function syncGame(gameId: string): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }
  await withGameLock(gameId, () => syncGameOnce(gameId));
}

async function syncGameOnce(gameId: string): Promise<void> {
  const events = await db.gameEvents.where("gameId").equals(gameId).toArray();

  const toInsert = events.filter((event) => !event.syncedInsert);
  if (toInsert.length > 0) {
    await pushEventsBatch(gameId, toInsert);
    await db.gameEvents.bulkPut(toInsert.map((event) => ({ ...event, syncedInsert: true })));
  }

  const toVoid = events.filter((event) => event.syncedInsert && event.pendingVoidSync);
  for (const event of toVoid) {
    await voidEventOnServer(gameId, event.id);
    await db.gameEvents.update(event.id, { pendingVoidSync: false });
  }
}

export async function syncAllPending(): Promise<void> {
  const events = await db.gameEvents.toArray();
  const gameIds = [
    ...new Set(
      events
        .filter((event) => !event.syncedInsert || event.pendingVoidSync)
        .map((event) => event.gameId),
    ),
  ];
  for (const gameId of gameIds) {
    await syncGame(gameId);
  }
}

export async function pendingEventCount(gameId: string): Promise<number> {
  const events = await db.gameEvents.where("gameId").equals(gameId).toArray();
  return events.filter((event) => !event.syncedInsert || event.pendingVoidSync).length;
}

/** Registers a Background Sync tag so the service worker can flush IndexedDB
 * when the browser comes back online, even if the tab was in the background.
 * No-ops on browsers that don't expose SyncManager (Safari, Firefox). */
export async function requestBackgroundSync(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (
      registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }
    ).sync;
    await syncManager?.register("basketstats-sync");
  } catch {
    // Unsupported or permission denied: the in-page backoff loop still retries.
  }
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export interface SyncLoop {
  stop: () => void;
  kick: () => void;
}

/** In-page retry loop with exponential backoff. Complements Background Sync:
 * the SW wakes us when the OS notices connectivity; this loop covers browsers
 * without SyncManager and mid-session failures while the tab stays open. */
export function startSyncLoop(gameId: string, onStatus: (status: SyncStatus) => void): SyncLoop {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempt = 0;
  let inFlight = false;

  async function tick() {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        onStatus("offline");
        return;
      }
      await syncGame(gameId);
      if (stopped) return;
      const pending = await pendingEventCount(gameId);
      onStatus(pending > 0 ? "pending" : "synced");
      if (pending > 0) {
        attempt += 1;
        schedule();
      } else {
        attempt = 0;
      }
    } catch {
      if (stopped) return;
      onStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "pending");
      attempt += 1;
      schedule();
      void requestBackgroundSync();
    } finally {
      inFlight = false;
    }
  }

  function schedule() {
    if (stopped) return;
    const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void tick(), delay);
  }

  function kick() {
    attempt = 0;
    if (timer) clearTimeout(timer);
    void tick();
    void requestBackgroundSync();
  }

  void tick();

  const onOnline = () => kick();
  const onOffline = () => onStatus("offline");
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "BACKGROUND_SYNC") kick();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    navigator.serviceWorker?.addEventListener("message", onMessage);
  }

  return {
    kick,
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
        navigator.serviceWorker?.removeEventListener("message", onMessage);
      }
    },
  };
}
