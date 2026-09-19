import { computeBoxScore, formatClock, type LiveClock } from "../../domain/boxScore";
import type { CachedPlayer } from "../../offline/db";
import type { LocalGameEvent } from "../../offline/db";
import { FoulDots } from "./FoulDots";

interface StatsPanelProps {
  events: LocalGameEvent[];
  players: CachedPlayer[];
  starterIds: string[];
  onCourtIds: Set<string>;
  liveClock: LiveClock;
}

/** Live mini box score. Playing time is counted up to the current clock, so it
 * ticks up as the game runs instead of crediting whole periods in advance —
 * this is the panel a coach uses to spread minutes across the squad. */
export function StatsPanel({ events, players, starterIds, onCourtIds, liveClock }: StatsPanelProps) {
  const boxScore = computeBoxScore(
    events.filter((event) => !event.voided),
    starterIds,
    liveClock,
  );
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
            <th>MIN</th>
            <th>PTS</th>
            <th>REB</th>
            <th>PAD</th>
            <th>Fautes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, row }) => (
            <tr key={player.id} className={onCourtIds.has(player.id) ? "on-court-row" : undefined}>
              <td>
                {player.jerseyNumber} {playersById.get(player.id)?.lastName}
              </td>
              <td>{formatClock(row!.minutesS)}</td>
              <td>{row!.pts}</td>
              <td>{row!.rebTot}</td>
              <td>{row!.ast}</td>
              <td><FoulDots count={row!.pf} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
