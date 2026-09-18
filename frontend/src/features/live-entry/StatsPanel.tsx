import { computeBoxScore } from "../../domain/boxScore";
import type { CachedPlayer } from "../../offline/db";
import type { LocalGameEvent } from "../../offline/db";

interface StatsPanelProps {
  events: LocalGameEvent[];
  players: CachedPlayer[];
}

export function StatsPanel({ events, players }: StatsPanelProps) {
  const boxScore = computeBoxScore(events.filter((event) => !event.voided));
  const playersById = new Map(players.map((player) => [player.id, player]));

  const rows = players
    .map((player) => ({ player, row: boxScore.players.get(player.id) }))
    .filter((entry) => entry.row !== undefined);

  return (
    <section className="stats-panel">
      <table>
        <thead>
          <tr>
            <th>Joueur</th>
            <th>PTS</th>
            <th>REB</th>
            <th>PAD</th>
            <th>Fautes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, row }) => (
            <tr key={player.id}>
              <td>
                {player.jerseyNumber} {playersById.get(player.id)?.lastName}
              </td>
              <td>{row!.pts}</td>
              <td>{row!.rebTot}</td>
              <td>{row!.ast}</td>
              <td>{"●".repeat(row!.pf)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
