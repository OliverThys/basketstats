import { apiFetch } from "./http";
import type { CachedPlayer } from "../offline/db";

export interface PlayerApiRead {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  jersey_number: number;
  position: string;
  height_cm: number | null;
  weight_kg: number | null;
}

export interface PlayerInput {
  first_name: string;
  last_name: string;
  jersey_number: number;
  position: string;
  height_cm: number | null;
  weight_kg: number | null;
}

function toCachedPlayer(player: PlayerApiRead): CachedPlayer {
  return {
    id: player.id,
    teamId: player.team_id,
    firstName: player.first_name,
    lastName: player.last_name,
    jerseyNumber: player.jersey_number,
    position: player.position,
  };
}

export async function fetchTeamPlayers(teamId: string): Promise<CachedPlayer[]> {
  const players = await apiFetch<PlayerApiRead[]>(`/players?team_id=${teamId}`);
  return players.map(toCachedPlayer);
}

export async function fetchTeamPlayersDetailed(
  teamId: string,
  search?: string,
): Promise<PlayerApiRead[]> {
  const query = new URLSearchParams({ team_id: teamId });
  if (search) query.set("search", search);
  return apiFetch<PlayerApiRead[]>(`/players?${query.toString()}`);
}

export async function createPlayer(teamId: string, input: PlayerInput): Promise<PlayerApiRead> {
  return apiFetch<PlayerApiRead>("/players", {
    method: "POST",
    body: JSON.stringify({ team_id: teamId, ...input }),
  });
}

export async function updatePlayer(
  playerId: string,
  input: PlayerInput,
): Promise<PlayerApiRead> {
  return apiFetch<PlayerApiRead>(`/players/${playerId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deletePlayer(playerId: string): Promise<void> {
  await apiFetch<void>(`/players/${playerId}`, { method: "DELETE" });
}
