import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  addRosterEntry: vi.fn(),
}));

describe("ManagementScreen", () => {
  it("lists the organization's teams and their players", async () => {
    render(
      <ManagementScreen onBack={() => {}} onOpenGame={() => {}} onOpenSeason={() => {}} />,
    );

    expect(await screen.findByText("BC Spartak")).toBeInTheDocument();
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });
});
