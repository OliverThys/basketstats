/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
void self.skipWaiting();
clientsClaim();

interface SyncEventLike extends ExtendableEvent {
  readonly tag: string;
}

async function notifyClientsToSync(): Promise<void> {
  const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(windowClients.map((client) => client.postMessage({ type: "BACKGROUND_SYNC" })));
}

async function flushPendingFromIndexedDb(): Promise<void> {
  const { syncAllPending } = await import("./offline/sync");
  await syncAllPending();
  await notifyClientsToSync();
}

self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEventLike;
  if (syncEvent.tag !== "basketstats-sync") return;
  syncEvent.waitUntil(flushPendingFromIndexedDb());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_NOW") {
    event.waitUntil(flushPendingFromIndexedDb());
  }
});
