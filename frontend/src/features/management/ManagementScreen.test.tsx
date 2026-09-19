import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteGame, fetchTeamGames } from "../../api/games";
import { db } from "../../offline/db";
import { ManagementScreen } from "./ManagementScreen";

vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", org_id: "org-1", email: "coach@example.com", display_name: "Coach", role: "owner" },
    logout: vi.fn(),
  }),
}));

vi.mock("../../api/teams", () => ({
  fetchTeams: vi.fn(async () => [{ id: "team-1", org_id: "org-1", name: "BC Spartak" }]),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
}));

vi.mock("../../api/players", () => ({
  fetchTeamPlayersDetailed: vi.fn(async () => [
    {
      id: "player-1",
      team_id: "team-1",
      first_name: "Jane",
      last_name: "Doe",
      jersey_number: 7,
      position: "PG",
      height_cm: null,
      weight_kg: null,
    },
  ]),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  deletePlayer: vi.fn(),
}));

vi.mock("../../api/games", () => ({
  fetchTeamGames: vi.fn(async () => []),
  createGame: vi.fn(),
  deleteGame: vi.fn(),
  addRosterEntry: vi.fn(),
}));

const GAME = {
  id: "game-1",
  org_id: "org-1",
  home_team_id: "team-1",
  opponent_name: "UBC Binche",
  game_date: "2026-01-15T18:00:00Z",
  label: "J1",
  ruleset: "FIBA",
  status: "live",
  home_score: 11,
  opponent_score: 16,
};

/** Local traces of game-1 plus a neighbouring game that must survive. */
async function seedLocalData(): Promise<void> {
  await db.gameEvents.bulkPut([
    {
      id: "event-1",
      gameId: "game-1",
      seq: 1,
      period: 1,
      gameClock: "10:00",
      wallTime: "2026-01-15T18:00:00.000Z",
      actor: "home_player",
      playerId: "player-1",
      actionType: "FG2_MADE",
      x: null,
      y: null,
      meta: {},
      voided: false,
      syncedInsert: false,
      pendingVoidSync: false,
    },
    {
      id: "event-2",
      gameId: "game-2",
      seq: 1,
      period: 1,
      gameClock: "10:00",
      wallTime: "2026-01-15T18:00:00.000Z",
      actor: "home_player",
      playerId: "player-1",
      actionType: "FG3_MADE",
      x: null,
      y: null,
      meta: {},
      voided: false,
      syncedInsert: false,
      pendingVoidSync: false,
    },
  ]);
  await db.roster.bulkPut([
    { id: "roster-1", gameId: "game-1", playerId: "player-1", isStarter: true, dnp: false },
    { id: "roster-2", gameId: "game-2", playerId: "player-1", isStarter: true, dnp: false },
  ]);
  await db.games.bulkPut([
    {
      id: "game-1",
      orgId: "org-1",
      homeTeamId: "team-1",
      opponentName: "UBC Binche",
      gameDate: GAME.game_date,
      label: "J1",
      ruleset: "FIBA",
      status: "live",
    },
  ]);
  localStorage.setItem("basketstats_clock_game-1", JSON.stringify({ period: 1, remainingS: 300 }));
}

async function openGamesTab(): Promise<HTMLElement> {
  render(<ManagementScreen onOpenGame={() => {}} onOpenSeason={() => {}} />);
  await screen.findByText("BC Spartak");
  fireEvent.click(screen.getByRole("button", { name: "Matchs" }));
  return screen.findByRole("row", { name: /UBC Binche/ });
}

describe("ManagementScreen", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await db.gameEvents.clear();
    await db.roster.clear();
    await db.games.clear();
  });

  it("lists the organization's teams and their players", async () => {
    render(<ManagementScreen onOpenGame={() => {}} onOpenSeason={() => {}} />);

    expect(await screen.findByText("BC Spartak")).toBeInTheDocument();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  it("deletes a game on the server and wipes its local data", async () => {
    await seedLocalData();
    vi.mocked(fetchTeamGames).mockResolvedValueOnce([GAME]).mockResolvedValueOnce([]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const row = await openGamesTab();
    fireEvent.click(within(row).getByRole("button", { name: "Supprimer" }));

    expect(vi.mocked(deleteGame)).toHaveBeenCalledWith("game-1");

    // The journal, roster and cached game of game-1 are gone — and only those:
    // a sibling game's unpushed events must not be collateral damage.
    await waitFor(async () => {
      expect(await db.gameEvents.where("gameId").equals("game-1").count()).toBe(0);
    });
    expect(await db.gameEvents.where("gameId").equals("game-2").count()).toBe(1);
    expect(await db.roster.where("gameId").equals("game-1").count()).toBe(0);
    expect(await db.roster.where("gameId").equals("game-2").count()).toBe(1);
    expect(await db.games.get("game-1")).toBeUndefined();
    expect(localStorage.getItem("basketstats_clock_game-1")).toBeNull();

    expect(await screen.findByText("Aucun match")).toBeInTheDocument();
  });

  it("keeps the local data when the server refuses the deletion", async () => {
    await seedLocalData();
    vi.mocked(fetchTeamGames).mockResolvedValue([GAME]);
    vi.mocked(deleteGame).mockRejectedValueOnce(new Error("offline"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const row = await openGamesTab();
    fireEvent.click(within(row).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    // Purging locally would have destroyed events the server still expects.
    expect(await db.gameEvents.where("gameId").equals("game-1").count()).toBe(1);
    expect(await db.games.get("game-1")).toBeDefined();
    expect(localStorage.getItem("basketstats_clock_game-1")).not.toBeNull();
  });

  it("does not delete when the confirmation is dismissed", async () => {
    await seedLocalData();
    vi.mocked(fetchTeamGames).mockResolvedValue([GAME]);
    vi.spyOn(window, "confirm").mockReturnValue(false);

    const row = await openGamesTab();
    fireEvent.click(within(row).getByRole("button", { name: "Supprimer" }));

    expect(vi.mocked(deleteGame)).not.toHaveBeenCalled();
    expect(await db.gameEvents.where("gameId").equals("game-1").count()).toBe(1);
  });
});
