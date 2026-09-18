import { useQuery } from "@tanstack/react-query";
import { Fragment, useState } from "react";

import { downloadExport } from "../../api/exports";
import { fetchTeamPlayers } from "../../api/players";
import {
  fetchSeasonStats,
  fetchTeam,
  fetchTeamShotZones,
  type ShotZoneReportApi,
} from "../../api/stats";
import {
  computeShotZones,
  SHOT_ZONES,
  type ShotZone,
  type ShotZoneReport,
} from "../../domain/shotZones";
import { ShotZonesTable } from "./ShotZonesTable";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function reportFromApi(data: ShotZoneReportApi): ShotZoneReport {
  const report = computeShotZones([], data.games);
  const known = new Set<string>(SHOT_ZONES);
  for (const line of data.zones) {
    if (!known.has(line.zone)) continue;
    report.zones[line.zone as ShotZone] = {
      zone: line.zone as ShotZone,
      made: line.made,
      attempted: line.attempted,
    };
  }
  return report;
}

interface SeasonStatsScreenProps {
  teamId: string;
  onBack: () => void;
}

export function SeasonStatsScreen({ teamId, onBack }: SeasonStatsScreenProps) {
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const teamQuery = useQuery({ queryKey: ["team", teamId], queryFn: () => fetchTeam(teamId) });
  const statsQuery = useQuery({
    queryKey: ["season-stats", teamId],
    queryFn: () => fetchSeasonStats(teamId),
  });
  const zonesQuery = useQuery({
    queryKey: ["team-shot-zones", teamId],
    queryFn: () => fetchTeamShotZones(teamId),
  });
  const playersQuery = useQuery({
    queryKey: ["team-players", teamId],
    queryFn: () => fetchTeamPlayers(teamId),
  });

  const playersById = new Map((playersQuery.data ?? []).map((player) => [player.id, player]));
  const zoneReport = zonesQuery.data ? reportFromApi(zonesQuery.data) : null;

  return (
    <main className="app-shell season-stats-screen">
      <header className="season-stats-header">
        <button className="header-btn" onClick={onBack}>Retour</button>
        <h1>{teamQuery.data?.name ?? "Stats de la saison"}</h1>
        <div className="export-actions">
          <button onClick={() => void downloadExport(`/teams/${teamId}/season-stats.csv`, `season-${teamId}.csv`)}>
            CSV
          </button>
          <button onClick={() => void downloadExport(`/teams/${teamId}/season-stats.pdf`, `season-${teamId}.pdf`)}>
            PDF
          </button>
        </div>
      </header>

      {statsQuery.isError && <p>Impossible de charger les stats de la saison. Vérifiez l'ID de l'équipe et l'API.</p>}
      {statsQuery.isLoading && <p>Chargement de la saison…</p>}

      {statsQuery.data && (
        <>
          <p className="season-meta">
            {statsQuery.data.games} matchs · Les matchs non joués (DNP) sont exclus des moyennes par match
          </p>
          <div className="table-scroll">
            <table className="box-score-table">
              <thead>
                <tr>
                  <th>Joueur</th>
                  <th>MJ</th>
                  <th>PTS</th>
                  <th>PTS/M</th>
                  <th>REB</th>
                  <th>PAD</th>
                  <th>MIN</th>
                  <th>+/-</th>
                  <th>eFG%</th>
                  <th>TS%</th>
                </tr>
              </thead>
              <tbody>
                {statsQuery.data.players.map((row) => {
                  const player = playersById.get(row.player_id);
                  const name = player ? `${player.firstName} ${player.lastName}` : row.player_id;
                  const open = expandedPlayerId === row.player_id;
                  return (
                    <Fragment key={row.player_id}>
                      <tr className="season-player-row" onClick={() => setExpandedPlayerId(open ? null : row.player_id)}>
                        <td>{name}</td>
                        <td>{row.totals.games_played}</td>
                        <td>{row.totals.pts}</td>
                        <td>{row.totals.pts_avg.toFixed(1)}</td>
                        <td>{row.totals.reb_tot}</td>
                        <td>{row.totals.ast}</td>
                        <td>{row.totals.minutes.toFixed(1)}</td>
                        <td>{row.totals.plus_minus}</td>
                        <td>{pct(row.totals.efg_pct)}</td>
                        <td>{pct(row.totals.ts_pct)}</td>
                      </tr>
                      {open &&
                        Object.entries(row.by_opponent).map(([opponent, totals]) => (
                          <tr key={`${row.player_id}-${opponent}`} className="opponent-split-row">
                            <td>vs {opponent}</td>
                            <td>{totals.games_played}</td>
                            <td>{totals.pts}</td>
                            <td>{totals.pts_avg.toFixed(1)}</td>
                            <td>{totals.reb_tot}</td>
                            <td>{totals.ast}</td>
                            <td>{totals.minutes.toFixed(1)}</td>
                            <td>{totals.plus_minus}</td>
                            <td>{pct(totals.efg_pct)}</td>
                            <td>{pct(totals.ts_pct)}</td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {zoneReport && (
        <section className="shot-zones-section">
          <h2>Zones de tir</h2>
          <ShotZonesTable report={zoneReport} />
        </section>
      )}
    </main>
  );
}
