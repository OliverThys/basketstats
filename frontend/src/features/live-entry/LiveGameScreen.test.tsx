import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    { id: "roster-2", gameId: "game-1", playerId: "player-2", isStarter: false, dnp: false },
  ]),
}));

vi.mock("../../api/players", () => ({
  fetchTeamPlayers: vi.fn(async () => [
    { id: "player-1", teamId: "team-1", firstName: "Henry", lastName: "Domercant", jerseyNumber: 44, position: "SG" },
    { id: "player-2", teamId: "team-1", firstName: "Lena", lastName: "Reserve", jerseyNumber: 7, position: "PG" },
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
    fireEvent.click(screen.getByText("Interception"));

    await waitFor(() => expect(screen.getByText(/Henry Domercant - Interception/)).toBeInTheDocument());

    const stored = await db.gameEvents.where("gameId").equals("game-1").toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].actionType).toBe("STEAL");
    expect(stored[0].playerId).toBe("player-1");
  });

  it("parks a shot selection and records it with tapped coordinates", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);

    const madeButtons = screen.getAllByText("Réussi");
    fireEvent.click(madeButtons[0]); // 2PT Made (first field-goal group)

    expect(await screen.findByText(/Touchez le terrain/i)).toBeInTheDocument();

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
    fireEvent.pointerUp(pad, { clientX: 25, clientY: 50 });

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
    fireEvent.click(screen.getAllByText("Réussi")[0]);

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
    fireEvent.pointerUp(pad, { clientX: 80, clientY: 50 });

    await waitFor(() => expect(screen.getByText(/2 points marqués/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Tirs"));
    const modal = document.querySelector(".modal-panel") as HTMLElement;
    expect(modal.querySelectorAll(".shot-marker-made")).toHaveLength(1);
  });

  it("shows advanced box-score columns and shot zones", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);
    await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(screen.getByText("Stats"));
    // Scoped to the modal: the live side panel now shows a MIN column too.
    const modal = within(document.querySelector(".modal-panel") as HTMLElement);
    expect(modal.getByText("MIN")).toBeInTheDocument();
    expect(modal.getByText("+/-")).toBeInTheDocument();
    expect(modal.getByText("eFG%")).toBeInTheDocument();
    expect(modal.getByText("TS%")).toBeInTheDocument();
    expect(modal.getByText("Sous le cercle")).toBeInTheDocument();
  });

  it("records a substitution as a paired SUB_OUT/SUB_IN stamped with the clock", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);
    await screen.findByRole("button", { name: /Henry Domercant/ });

    expect(screen.getByText("Sur le terrain : 1/5")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Changement"));
    fireEvent.click(screen.getByRole("button", { name: /Henry Domercant/ }));
    fireEvent.click(screen.getByRole("button", { name: /Lena Reserve/ }));

    await waitFor(async () => {
      const stored = await db.gameEvents.where("gameId").equals("game-1").sortBy("seq");
      expect(stored.map((event) => [event.actionType, event.playerId])).toEqual([
        ["SUB_OUT", "player-1"],
        ["SUB_IN", "player-2"],
      ]);
      expect(stored.map((event) => event.gameClock)).toEqual(["10:00", "10:00"]);
    });
  });

  it("re-derives who is on the court from the substitution events", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);
    await screen.findByRole("button", { name: /Henry Domercant/ });

    expect(screen.getByRole("button", { name: /Henry Domercant/ })).toHaveAttribute("title", "Sur le terrain");
    expect(screen.getByRole("button", { name: /Lena Reserve/ })).toHaveAttribute("title", "Sur le banc");

    fireEvent.click(screen.getByText("Changement"));
    fireEvent.click(screen.getByRole("button", { name: /Henry Domercant/ }));
    fireEvent.click(screen.getByRole("button", { name: /Lena Reserve/ }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Lena Reserve/ })).toHaveAttribute("title", "Sur le terrain"),
    );
    expect(screen.getByRole("button", { name: /Henry Domercant/ })).toHaveAttribute("title", "Sur le banc");
  });

  it("credits playing time to the five on the court", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);
    await screen.findByRole("button", { name: /Henry Domercant/ });

    // A starter who is never subbed out is credited the whole period once the
    // journal moves on to Q2.
    fireEvent.click(screen.getByRole("button", { name: /Henry Domercant/ }));
    fireEvent.click(screen.getByText("Interception"));
    await waitFor(() => expect(screen.getByText(/Henry Domercant - Interception/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Q2"));
    fireEvent.click(screen.getByRole("button", { name: /Henry Domercant/ }));
    fireEvent.click(screen.getByText("Passe"));
    await waitFor(() =>
      expect(screen.getByText(/Henry Domercant - Passe décisive/)).toBeInTheDocument(),
    );

    const panel = within(document.querySelector(".stats-panel") as HTMLElement);
    await waitFor(() => expect(panel.getByText("10:00")).toBeInTheDocument());
  });

  it("undoes the last action by voiding it locally", async () => {
    render(<LiveGameScreen gameId="game-1" onDone={() => {}} />);

    const playerButton = await screen.findByRole("button", { name: /Henry Domercant/ });
    fireEvent.click(playerButton);
    fireEvent.click(screen.getByText("Passe"));
    await waitFor(() => expect(screen.getByText(/Henry Domercant - Passe décisive/)).toBeInTheDocument());

    fireEvent.click(screen.getByText("Annuler"));

    await waitFor(async () => {
      const stored = await db.gameEvents.where("gameId").equals("game-1").toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].voided).toBe(true);
    });
  });
});
