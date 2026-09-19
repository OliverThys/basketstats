import { apiFetch } from "./http";
import type { CachedGame, CachedRosterEntry } from "../offline/db";

export interface GameApiRead {
  id: string;
  org_id: string;
  home_team_id: string;
  opponent_name: string;
  game_date: string;
  label: string | null;
  ruleset: string;
  status: string;
  home_score: number;
  opponent_score: number;
}

interface GameRosterApiRead {
  id: string;
  game_id: string;
  player_id: string;
  is_starter: boolean;
  dnp: boolean;
}

function toCachedGame(game: GameApiRead): CachedGame {
  return {
    id: game.id,
    orgId: game.org_id,
    homeTeamId: game.home_team_id,
    opponentName: game.opponent_name,
    gameDate: game.game_date,
    label: game.label,
    ruleset: game.ruleset,
    status: game.status,
  };
}

function toCachedRosterEntry(entry: GameRosterApiRead): CachedRosterEntry {
  return {
    id: entry.id,
    gameId: entry.game_id,
    playerId: entry.player_id,
    isStarter: entry.is_starter,
    dnp: entry.dnp,
  };
}

export async function fetchGame(gameId: string): Promise<CachedGame> {
  const game = await apiFetch<GameApiRead>(`/games/${gameId}`);
  return toCachedGame(game);
}

export async function fetchGameRoster(gameId: string): Promise<CachedRosterEntry[]> {
  const entries = await apiFetch<GameRosterApiRead[]>(`/games/${gameId}/roster`);
  return entries.map(toCachedRosterEntry);
}

export async function fetchTeamGames(teamId: string): Promise<GameApiRead[]> {
  return apiFetch<GameApiRead[]>(`/teams/${teamId}/games`);
}

export async function createGame(
  teamId: string,
  opponentName: string,
  gameDate: string,
  label?: string,
): Promise<GameApiRead> {
  return apiFetch<GameApiRead>("/games", {
    method: "POST",
    body: JSON.stringify({
      home_team_id: teamId,
      opponent_name: opponentName,
      game_date: gameDate,
      label: label || null,
    }),
  });
}

export async function deleteGame(gameId: string): Promise<void> {
  await apiFetch<void>(`/games/${gameId}`, { method: "DELETE" });
}

export async function addRosterEntry(
  gameId: string,
  playerId: string,
  isStarter: boolean,
): Promise<void> {
  await apiFetch<GameRosterApiRead>(`/games/${gameId}/roster`, {
    method: "POST",
    body: JSON.stringify({ player_id: playerId, is_starter: isStarter, dnp: false }),
  });
}
