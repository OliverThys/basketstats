import { pushEventsBatch, voidEventOnServer } from "../api/gameEvents";
import { db } from "./db";

export type SyncStatus = "synced" | "pending" | "offline";

/** Pushes locally-recorded events for a game to the API. Safe to call repeatedly
 * and concurrently: batch insert is idempotent server-side on the event UUID. */
export async function syncGame(gameId: string): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

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

export async function pendingEventCount(gameId: string): Promise<number> {
  const events = await db.gameEvents.where("gameId").equals(gameId).toArray();
  return events.filter((event) => !event.syncedInsert || event.pendingVoidSync).length;
}
