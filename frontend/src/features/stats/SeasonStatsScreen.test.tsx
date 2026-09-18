import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { SeasonStatsScreen } from "./SeasonStatsScreen";

vi.mock("../../api/stats", () => ({
  fetchTeam: vi.fn(async () => ({ id: "team-1", org_id: "org-1", name: "BC Spartak" })),
  fetchSeasonStats: vi.fn(async () => ({
    games: 2,
    players: [
      {
        player_id: "player-1",
        totals: {
          games_played: 2,
          pts: 30,
          pts_avg: 15,
          reb_tot: 0,
          ast: 0,
          minutes: 20,
          plus_minus: 4,
          efg_pct: 0.5,
          ts_pct: 0.55,
        },
        by_opponent: {
          "Opp A": {
            games_played: 1,
            pts: 10,
            pts_avg: 10,
            reb_tot: 0,
            ast: 0,
            minutes: 10,
            plus_minus: 2,
            efg_pct: 0.5,
            ts_pct: 0.5,
          },
        },
      },
    ],
  })),
  fetchTeamShotZones: vi.fn(async () => ({
    games: 2,
    zones: [{ zone: "at_rim", made: 4, attempted: 8, pct: 0.5, per_game: 4 }],
  })),
}));

vi.mock("../../api/players", () => ({
  fetchTeamPlayers: vi.fn(async () => [
    { id: "player-1", teamId: "team-1", firstName: "Henry", lastName: "Domercant", jerseyNumber: 44, position: "SF" },
  ]),
}));

vi.mock("../../api/exports", () => ({
  downloadExport: vi.fn(),
}));

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("SeasonStatsScreen", () => {
  it("renders totals and excludes nothing from the loaded averages", async () => {
    renderWithClient(<SeasonStatsScreen teamId="team-1" onBack={() => {}} />);
    expect(await screen.findByText("BC Spartak")).toBeInTheDocument();
    expect(screen.getByText("Henry Domercant")).toBeInTheDocument();
    expect(screen.getByText("15.0")).toBeInTheDocument();
    expect(screen.getByText("Sous le cercle")).toBeInTheDocument();
    expect(screen.getByText(/Les matchs non joués \(DNP\) sont exclus/)).toBeInTheDocument();
  });
});
