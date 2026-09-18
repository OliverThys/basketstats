import { apiFetch } from "./http";

export interface CountingTotalsApi {
  games_played: number;
  pts: number;
  pts_avg: number;
  reb_tot: number;
  ast: number;
  minutes: number;
  plus_minus: number;
  efg_pct: number;
  ts_pct: number;
}

export interface PlayerSeasonStatsApi {
  player_id: string;
  totals: CountingTotalsApi;
  by_opponent: Record<string, CountingTotalsApi>;
}

export interface SeasonReportApi {
  games: number;
  players: PlayerSeasonStatsApi[];
}

export interface ZoneLineApi {
  zone: string;
  made: number;
  attempted: number;
  pct: number;
  per_game: number;
}

export interface ShotZoneReportApi {
  games: number;
  zones: ZoneLineApi[];
}

export interface TeamReadApi {
  id: string;
  org_id: string;
  name: string;
}

export async function fetchTeam(teamId: string): Promise<TeamReadApi> {
  return apiFetch<TeamReadApi>(`/teams/${teamId}`);
}

export async function fetchSeasonStats(teamId: string): Promise<SeasonReportApi> {
  return apiFetch<SeasonReportApi>(`/teams/${teamId}/season-stats`);
}

export async function fetchTeamShotZones(teamId: string): Promise<ShotZoneReportApi> {
  return apiFetch<ShotZoneReportApi>(`/teams/${teamId}/shot-zones`);
}
