import Dexie, { type Table } from "dexie";

export interface LocalGameEvent {
  id: string;
  gameId: string;
  seq: number;
  actionType: string;
  playerId?: string;
  payload: Record<string, unknown>;
  createdAt: number;
  synced: boolean;
}

class BasketStatsDb extends Dexie {
  gameEvents!: Table<LocalGameEvent, string>;

  constructor() {
    super("basketstats");
    this.version(1).stores({
      gameEvents: "id, gameId, synced",
    });
  }
}

export const db = new BasketStatsDb();
