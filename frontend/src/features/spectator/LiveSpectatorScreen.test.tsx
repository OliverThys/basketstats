import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LiveSpectatorScreen } from "./LiveSpectatorScreen";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  emitSnapshot(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  close() {
    this.onclose?.();
  }
}

vi.stubGlobal("WebSocket", FakeWebSocket);

afterEach(() => {
  FakeWebSocket.instances = [];
});

describe("LiveSpectatorScreen", () => {
  it("renders the live score and box score once a snapshot arrives", () => {
    render(<LiveSpectatorScreen shareToken="abc123" />);
    expect(screen.getByText(/Connexion au match en direct/)).toBeInTheDocument();

    const socket = FakeWebSocket.instances[0];
    act(() => {
      socket.emitSnapshot({
        game: { id: "game-1", opponent_name: "Rival Club", label: "Game 1", status: "live" },
        box_score: {
          home_score: 12,
          opponent_score: 8,
          players: [{ player_id: "player-1", pts: 6, reb_tot: 2, ast: 1 }],
        },
        player_names: { "player-1": "Jane Doe" },
        recent_events: [
          { id: "evt-1", period: 1, action_type: "FG2_MADE", player_name: "Jane Doe" },
        ],
      });
    });

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText(/FG2_MADE/, { selector: "li" })).toBeInTheDocument();
  });
});
