import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "../../offline/db";
import { LiveGameScreen } from "./LiveGameScreen";

vi.mock("../../api/games", () => ({
  fetchGame: vi.fn(async () => ({
    id: "game-1",
    orgId: "org-1",
    homeTeamId: "team-1",
    opponentName: "BC Enisey",
    gameDate: "2026-01-01T00:00:00Z",
    label: "Game 1",
    ruleset: "FIBA",
    status: "live",
  })),
  fetchGameRoster: vi.fn(async () => [
    { id: "roster-1", gameId: "game-1", playerId: "player-1", isStarter: true, dnp: false },
  ]),
}));

vi.mock("../../api/players", () => ({
  fetchTeamPlayers: vi.fn(async () => [
    { id: "player-1", teamId: "team-1", firstName: "Henry", lastName: "Domercant", jerseyNumber: 44, position: "SG" },
  ]),
}));

vi.mock("../../api/gameEvents", () => ({
  pushEventsBatch: vi.fn(async () => ({ inserted: 0, skipped_existing: 0 })),
  voidEventOnServer: vi.fn(async () => undefined),
}));

describe("LiveGameScreen", () => {
  beforeEach(async () => {
    await db.gameEvents.clear();
    await db.games.clear();
    await db.players.clear();
    await db.roster.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("records a two-step non-shot event and reflects it in play-by-play and stats", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);
    fireEvent.click(screen.getByText("Steal"));

    await waitFor(() => expect(screen.getByText(/Henry Domercant - Steal/)).toBeInTheDocument());

    const stored = await db.gameEvents.where("gameId").equals("game-1").toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].actionType).toBe("STEAL");
    expect(stored[0].playerId).toBe("player-1");
  });

  it("parks a shot selection and records it with tapped coordinates", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);

    const madeButtons = screen.getAllByText("Made");
    fireEvent.click(madeButtons[0]); // 2pt Made

    expect(await screen.findByText(/tap the court/i)).toBeInTheDocument();

    const pad = screen.getByTestId("shot-pad");
    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);
    fireEvent.click(pad, { clientX: 25, clientY: 50 });

    await waitFor(async () => {
      const stored = await db.gameEvents.where("gameId").equals("game-1").toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].actionType).toBe("FG2_MADE");
      expect(stored[0].x).toBeCloseTo(0.25);
      expect(stored[0].y).toBeCloseTo(0.5);
    });
  });

  it("shows a recorded shot on the shot chart at the tapped location", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);
    fireEvent.click(screen.getAllByText("Made")[0]);

    const pad = await screen.findByTestId("shot-pad");
    vi.spyOn(pad, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect);
    fireEvent.click(pad, { clientX: 80, clientY: 50 });

    await waitFor(() => expect(screen.getByText(/2pt Made/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Shot Chart"));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(1);
  });

  it("shows advanced box-score columns and shot zones", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);
    await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(screen.getByText("Box Score"));
    expect(screen.getByText("MIN")).toBeInTheDocument();
    expect(screen.getByText("+/-")).toBeInTheDocument();
    expect(screen.getByText("eFG%")).toBeInTheDocument();
    expect(screen.getByText("TS%")).toBeInTheDocument();
    expect(screen.getByText("At rim")).toBeInTheDocument();
  });

  it("undoes the last action by voiding it locally", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);
    fireEvent.click(screen.getByText("Assist"));
    await waitFor(() => expect(screen.getByText(/Henry Domercant - Assist/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Undo last action"));

    await waitFor(async () => {
      const stored = await db.gameEvents.where("gameId").equals("game-1").toArray();
      expect(stored[0].voided).toBe(true);
    });
  });
});
