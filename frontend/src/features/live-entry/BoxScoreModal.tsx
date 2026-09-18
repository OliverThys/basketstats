import { computeBoxScore } from "../../domain/boxScore";
import { computeShotZones } from "../../domain/shotZones";
import { downloadExport } from "../../api/exports";
import type { CachedPlayer, CachedRosterEntry, LocalGameEvent } from "../../offline/db";
import { ShotZonesTable } from "../stats/ShotZonesTable";
import { Modal } from "./Modal";

interface BoxScoreModalProps {
  gameId: string;
  events: LocalGameEvent[];
  players: CachedPlayer[];
  roster: CachedRosterEntry[];
  onClose: () => void;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function BoxScoreModal({ gameId, events, players, roster, onClose }: BoxScoreModalProps) {
  const starters = roster.filter((entry) => entry.isStarter && !entry.dnp).map((entry) => entry.playerId);
  const boxScore = computeBoxScore(
    events.filter((event) => !event.voided),
    starters,
  );
  const playersById = new Map(players.map((player) => [player.id, player]));
  const rows = [...boxScore.players.values()];
  const zones = computeShotZones(events.filter((event) => !event.voided), 1);

  return (
    <Modal title="Box Score" onClose={onClose}>
      <div className="export-actions">
        <button onClick={() => void downloadExport(`/games/${gameId}/box-score.csv`, `box-score-${gameId}.csv`)}>
          CSV
        </button>
        <button onClick={() => void downloadExport(`/games/${gameId}/box-score.pdf`, `box-score-${gameId}.pdf`)}>
          PDF
        </button>
      </div>
      <div className="table-scroll">
        <table className="box-score-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>MIN</th>
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
              <th>+/-</th>
              <th>eFG%</th>
              <th>TS%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const player = playersById.get(row.playerId);
              return (
                <tr key={row.playerId}>
                  <td>{player ? `${player.firstName} ${player.lastName}` : row.playerId}</td>
                  <td>{row.minutes.toFixed(1)}</td>
                  <td>
                    {row.fgm}-{row.fga}
                  </td>
                  <td>
                    {row.fg2m}-{row.fg2a}
                  </td>
                  <td>
                    {row.fg3m}-{row.fg3a}
                  </td>
                  <td>
                    {row.ftm}-{row.fta}
                  </td>
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
                  <td>{signed(row.plusMinus)}</td>
                  <td>{pct(row.efgPct)}</td>
                  <td>{pct(row.tsPct)}</td>
                </tr>
              );
            })}
            <tr className="totals-row">
              <td>Totals</td>
              <td />
              <td>
                {boxScore.totals.fgm}-{boxScore.totals.fga}
              </td>
              <td>
                {boxScore.totals.fg2m}-{boxScore.totals.fg2a}
              </td>
              <td>
                {boxScore.totals.fg3m}-{boxScore.totals.fg3a}
              </td>
              <td>
                {boxScore.totals.ftm}-{boxScore.totals.fta}
              </td>
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
              <td />
              <td>{pct(boxScore.totals.efgPct)}</td>
              <td>{pct(boxScore.totals.tsPct)}</td>
            </tr>
            <tr className="pct-row">
              <td>%</td>
              <td />
              <td>{pct(boxScore.totals.fgPct)}</td>
              <td>{pct(boxScore.totals.fg2Pct)}</td>
              <td>{pct(boxScore.totals.fg3Pct)}</td>
              <td>{pct(boxScore.totals.ftPct)}</td>
              <td colSpan={14} />
            </tr>
          </tbody>
        </table>
      </div>
      <section className="shot-zones-section">
        <h4>Shot zones</h4>
        <ShotZonesTable report={zones} />
      </section>
    </Modal>
  );
}
