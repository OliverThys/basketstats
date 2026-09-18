import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db, type LocalGameEvent } from "./db";
import { pendingEventCount, syncAllPending, syncGame } from "./sync";

vi.mock("../api/gameEvents", () => ({
  pushEventsBatch: vi.fn(async () => ({ inserted: 1, skipped_existing: 0 })),
  voidEventOnServer: vi.fn(async () => undefined),
  fetchGameEvents: vi.fn(async () => []),
}));

import { pushEventsBatch, voidEventOnServer } from "../api/gameEvents";

function event(overrides: Partial<LocalGameEvent>): LocalGameEvent {
  return {
    id: "e1",
    gameId: "g1",
    seq: 1,
    period: 1,
    gameClock: null,
    wallTime: "2026-01-01T00:00:00Z",
    actor: "home_player",
    playerId: "p1",
    actionType: "STEAL",
    x: null,
    y: null,
    meta: {},
    voided: false,
    syncedInsert: false,
    pendingVoidSync: false,
    ...overrides,
  };
}

describe("syncGame", () => {
  beforeEach(async () => {
    await db.gameEvents.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pushes unsynced events once and marks them syncedInsert", async () => {
    await db.gameEvents.add(event({ id: "a" }));
    await syncGame("g1");
    expect(pushEventsBatch).toHaveBeenCalledTimes(1);
    expect((await db.gameEvents.get("a"))?.syncedInsert).toBe(true);
  });

  it("does not duplicate a push when called concurrently", async () => {
    await db.gameEvents.add(event({ id: "a" }));
    vi.mocked(pushEventsBatch).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { inserted: 1, skipped_existing: 0 };
    });
    await Promise.all([syncGame("g1"), syncGame("g1")]);
    expect(pushEventsBatch).toHaveBeenCalledTimes(1);
    expect((await db.gameEvents.get("a"))?.syncedInsert).toBe(true);
  });

  it("skips the network while offline and leaves events pending", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    await db.gameEvents.add(event({ id: "a" }));
    await syncGame("g1");
    expect(pushEventsBatch).not.toHaveBeenCalled();
    expect(await pendingEventCount("g1")).toBe(1);
  });

  it("propagates already-synced voids and retries are idempotent locally", async () => {
    await db.gameEvents.add(event({ id: "a", syncedInsert: true, voided: true, pendingVoidSync: true }));
    await syncGame("g1");
    await syncGame("g1");
    expect(voidEventOnServer).toHaveBeenCalledTimes(1);
    expect(voidEventOnServer).toHaveBeenCalledWith("g1", "a");
    expect((await db.gameEvents.get("a"))?.pendingVoidSync).toBe(false);
  });

  it("syncAllPending flushes every game that has work", async () => {
    await db.gameEvents.bulkAdd([event({ id: "a", gameId: "g1" }), event({ id: "b", gameId: "g2", seq: 1 })]);
    await syncAllPending();
    expect(pushEventsBatch).toHaveBeenCalledTimes(2);
  });
});
