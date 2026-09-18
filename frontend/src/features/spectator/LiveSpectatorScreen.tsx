import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../../api/http";

interface SpectatorEvent {
  id: string;
  period: number;
  action_type: string;
  player_name: string | null;
}

interface SpectatorPlayerBoxScore {
  player_id: string;
  pts: number;
  reb_tot: number;
  ast: number;
}

interface SpectatorSnapshot {
  game: { id: string; opponent_name: string; label: string | null; status: string };
  box_score: {
    home_score: number;
    opponent_score: number;
    players: SpectatorPlayerBoxScore[];
  };
  recent_events: SpectatorEvent[];
  player_names: Record<string, string>;
}

function wsUrl(shareToken: string): string {
  const url = new URL(`${API_BASE_URL}/live/${shareToken}/ws`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function LiveSpectatorScreen({ shareToken }: { shareToken: string }) {
  const [snapshot, setSnapshot] = useState<SpectatorSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(wsUrl(shareToken));
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setError("Connexion perdue, nouvelle tentative...");
    socket.onmessage = (event) => {
      setSnapshot(JSON.parse(event.data) as SpectatorSnapshot);
    };

    return () => socket.close();
  }, [shareToken]);

  if (!snapshot) {
    return (
      <div className="app-frame">
        <div className="app-screen spectator-screen">
          <header className="app-screen-header">
            <h1>BasketStats — Direct</h1>
          </header>
          <p className="spectator-body">{error ?? "Connexion au match en direct..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-frame">
      <div className="app-screen spectator-screen">
        <header className="app-screen-header">
          <h1>{snapshot.game.label ?? "Match en direct"}</h1>
          <p className="spectator-subtitle">
            vs {snapshot.game.opponent_name} — <span data-testid="connection-status">{connected ? "en direct" : "reconnexion..."}</span>
          </p>
        </header>

        <div className="spectator-body">
          <div className="spectator-score">
            <div className="team-score">
              <span className="team-name">Domicile</span>
              <span className="score-value">{snapshot.box_score.home_score}</span>
            </div>
            <span className="scoreboard-sep">-</span>
            <div className="team-score">
              <span className="team-name">{snapshot.game.opponent_name}</span>
              <span className="score-value">{snapshot.box_score.opponent_score}</span>
            </div>
          </div>

          <section>
            <h2>Fil du match</h2>
            <ul className="spectator-feed">
              {snapshot.recent_events.map((event) => (
                <li key={event.id}>
                  <span className="spectator-period-badge">Q{event.period}</span>
                  {event.player_name ? `${event.player_name} — ` : ""}
                  {event.action_type}
                </li>
              ))}
              {snapshot.recent_events.length === 0 && <li>Le match n'a pas encore commencé.</li>}
            </ul>
          </section>

          <section>
            <h2>Box score</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>PTS</th>
                  <th>REB</th>
                  <th>AST</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.box_score.players.map((player) => (
                  <tr key={player.player_id}>
                    <td>{snapshot.player_names[player.player_id] ?? player.player_id}</td>
                    <td>{player.pts}</td>
                    <td>{player.reb_tot}</td>
                    <td>{player.ast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
