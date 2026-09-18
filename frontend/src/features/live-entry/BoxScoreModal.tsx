import { computeBoxScore } from "../../domain/boxScore";
import type { CachedPlayer, LocalGameEvent } from "../../offline/db";
import { Modal } from "./Modal";

interface BoxScoreModalProps {
  events: LocalGameEvent[];
  players: CachedPlayer[];
  onClose: () => void;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function BoxScoreModal({ events, players, onClose }: BoxScoreModalProps) {
  const boxScore = computeBoxScore(events.filter((event) => !event.voided));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const rows = [...boxScore.players.values()];

  return (
    <Modal title="Box Score" onClose={onClose}>
      <table className="box-score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>FGM-A</th>
            <th>2PM-A</th>
            <th>3PM-A</th>
            <th>FTM-A</th>
            <th>OFF</th>
            <th>DEF</th>
            <th>TOT</th>
            <th>AST</th>
            <th>ST</th>
            <th>TO</th>
            <th>BS</th>
            <th>PF</th>
            <th>FPF</th>
            <th>EFF</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const player = playersById.get(row.playerId);
            return (
              <tr key={row.playerId}>
                <td>{player ? `${player.firstName} ${player.lastName}` : row.playerId}</td>
                <td>{row.fgm}-{row.fga}</td>
                <td>{row.fg2m}-{row.fg2a}</td>
                <td>{row.fg3m}-{row.fg3a}</td>
                <td>{row.ftm}-{row.fta}</td>
                <td>{row.rebOff}</td>
                <td>{row.rebDef}</td>
                <td>{row.rebTot}</td>
                <td>{row.ast}</td>
                <td>{row.stl}</td>
                <td>{row.tov}</td>
                <td>{row.blk}</td>
                <td>{row.pf}</td>
                <td>{row.fpf}</td>
                <td>{row.eff}</td>
                <td>{row.pts}</td>
              </tr>
            );
          })}
          <tr className="totals-row">
            <td>Totals</td>
            <td>{boxScore.totals.fgm}-{boxScore.totals.fga}</td>
            <td>{boxScore.totals.fg2m}-{boxScore.totals.fg2a}</td>
            <td>{boxScore.totals.fg3m}-{boxScore.totals.fg3a}</td>
            <td>{boxScore.totals.ftm}-{boxScore.totals.fta}</td>
            <td>{boxScore.totals.rebOff}</td>
            <td>{boxScore.totals.rebDef}</td>
            <td>{boxScore.totals.rebTot}</td>
            <td>{boxScore.totals.ast}</td>
            <td>{boxScore.totals.stl}</td>
            <td>{boxScore.totals.tov}</td>
            <td>{boxScore.totals.blk}</td>
            <td>{boxScore.totals.pf}</td>
            <td>{boxScore.totals.fpf}</td>
            <td>{boxScore.totals.eff}</td>
            <td>{boxScore.totals.pts}</td>
          </tr>
          <tr className="pct-row">
            <td>%</td>
            <td>{pct(boxScore.totals.fgPct)}</td>
            <td>{pct(boxScore.totals.fg2Pct)}</td>
            <td>{pct(boxScore.totals.fg3Pct)}</td>
            <td>{pct(boxScore.totals.ftPct)}</td>
            <td colSpan={11} />
          </tr>
        </tbody>
      </table>
    </Modal>
  );
}
