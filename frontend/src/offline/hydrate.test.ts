import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, type LocalGameEvent } from "./db";
import { hydrateEventsFromServer } from "./hydrate";

vi.mock("../api/gameEvents", () => ({
  fetchGameEvents: vi.fn(),
}));

import { fetchGameEvents } from "../api/gameEvents";

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
    syncedInsert: true,
    pendingVoidSync: false,
    ...overrides,
  };
}

describe("hydrateEventsFromServer", () => {
  beforeEach(async () => {
    await db.gameEvents.clear();
    vi.clearAllMocks();
  });

  it("inserts remote events that the device does not have yet", async () => {
    vi.mocked(fetchGameEvents).mockResolvedValue([event({ id: "remote" })]);
    await hydrateEventsFromServer("g1");
    const stored = await db.gameEvents.get("remote");
    expect(stored?.syncedInsert).toBe(true);
    expect(stored?.actionType).toBe("STEAL");
  });

  it("does not clobber a local unsynced insert", async () => {
    await db.gameEvents.add(event({ id: "local", syncedInsert: false, actionType: "ASSIST" }));
    vi.mocked(fetchGameEvents).mockResolvedValue([event({ id: "local", actionType: "STEAL" })]);
    await hydrateEventsFromServer("g1");
    expect((await db.gameEvents.get("local"))?.actionType).toBe("ASSIST");
    expect((await db.gameEvents.get("local"))?.syncedInsert).toBe(false);
  });

  it("applies a remote void onto a fully-synced local event", async () => {
    await db.gameEvents.add(event({ id: "e1", voided: false, syncedInsert: true }));
    vi.mocked(fetchGameEvents).mockResolvedValue([event({ id: "e1", voided: true })]);
    await hydrateEventsFromServer("g1");
    expect((await db.gameEvents.get("e1"))?.voided).toBe(true);
  });
});
