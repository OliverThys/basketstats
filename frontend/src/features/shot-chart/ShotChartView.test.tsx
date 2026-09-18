import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActionType } from "../../domain/actionTypes";
import type { CachedPlayer, LocalGameEvent } from "../../offline/db";
import { ShotChartView } from "./ShotChartView";

const players: CachedPlayer[] = [
  { id: "p1", teamId: "t1", firstName: "Henry", lastName: "Domercant", jerseyNumber: 44, position: "SF" },
  { id: "p2", teamId: "t1", firstName: "Sasha", lastName: "Korchagin", jerseyNumber: 6, position: "PG" },
];

function shotEvent(overrides: Partial<LocalGameEvent>): LocalGameEvent {
  return {
    id: "e1",
    gameId: "g1",
    seq: 1,
    period: 1,
    gameClock: null,
    wallTime: "2026-01-01T00:00:00Z",
    actor: "home_player",
    playerId: "p1",
    actionType: ActionType.FG2_MADE,
    x: 0.5,
    y: 0.5,
    meta: {},
    voided: false,
    syncedInsert: true,
    pendingVoidSync: false,
    ...overrides,
  };
}

describe("ShotChartView", () => {
  it("shows every player's shots by default and hides them when deselected", () => {
    const events: LocalGameEvent[] = [
      shotEvent({ id: "s1", playerId: "p1" }),
      shotEvent({ id: "s2", playerId: "p2", period: 2 }),
    ];
    render(<ShotChartView events={events} players={players} onClose={() => {}} />);

    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(2);

    fireEvent.click(screen.getByLabelText(/Henry Domercant/));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(1);
  });

  it("filters by quarter", () => {
    const events: LocalGameEvent[] = [
      shotEvent({ id: "s1", playerId: "p1", period: 1 }),
      shotEvent({ id: "s2", playerId: "p2", period: 2 }),
    ];
    render(<ShotChartView events={events} players={players} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Q2"));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(1);
  });

  it("Deselect All hides every shot and Select All restores them", () => {
    const events: LocalGameEvent[] = [shotEvent({ id: "s1", playerId: "p1" }), shotEvent({ id: "s2", playerId: "p2" })];
    render(<ShotChartView events={events} players={players} onClose={() => {}} />);

    fireEvent.click(screen.getByText("Deselect All"));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(0);

    fireEvent.click(screen.getByText("Select All"));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(2);
  });

  it("renders missed shots as crosses and made shots as circles", () => {
    const events: LocalGameEvent[] = [
      shotEvent({ id: "made", playerId: "p1", actionType: ActionType.FG2_MADE }),
      shotEvent({ id: "miss", playerId: "p2", actionType: ActionType.FG3_MISS }),
    ];
    render(<ShotChartView events={events} players={players} onClose={() => {}} />);

    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(1);
    expect(document.querySelectorAll(".shot-marker-missed")).toHaveLength(1);
  });

  it("filters overtime via the OT tab", () => {
    const events: LocalGameEvent[] = [
      shotEvent({ id: "q1", playerId: "p1", period: 1 }),
      shotEvent({ id: "ot", playerId: "p2", period: 5 }),
    ];
    render(<ShotChartView events={events} players={players} onClose={() => {}} />);

    fireEvent.click(screen.getByText("OT"));
    expect(document.querySelectorAll(".shot-marker-made")).toHaveLength(1);
  });

  it("exposes an export control", () => {
    render(<ShotChartView events={[]} players={players} onClose={() => {}} />);
    expect(screen.getByText("Export image")).toBeInTheDocument();
  });
});
