import { fetchGameEvents } from "../api/gameEvents";
import { db, type LocalGameEvent } from "./db";

/** Merges the server journal into IndexedDB without clobbering local work.
 * Local unsynced inserts and pending voids always win: they are the source of
 * truth until a successful push. Remote rows fill gaps after a crash/reload
 * on a device that already synced, or after the user opens the same game
 * again. Idempotent on event UUID. */
export async function hydrateEventsFromServer(gameId: string): Promise<void> {
  const remote = await fetchGameEvents(gameId, true);
  const local = await db.gameEvents.where("gameId").equals(gameId).toArray();
  const localById = new Map(local.map((event) => [event.id, event]));

  const puts: LocalGameEvent[] = [];
  for (const remoteEvent of remote) {
    const existing = localById.get(remoteEvent.id);
    if (!existing) {
      puts.push({ ...remoteEvent, syncedInsert: true, pendingVoidSync: false });
      continue;
    }
    if (!existing.syncedInsert || existing.pendingVoidSync) continue;
    if (remoteEvent.voided && !existing.voided) {
      puts.push({ ...existing, voided: true });
    }
  }

  if (puts.length > 0) {
    await db.gameEvents.bulkPut(puts);
  }
}
