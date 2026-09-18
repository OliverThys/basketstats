import { apiFetch } from "./http";
import type { CachedPlayer } from "../offline/db";

interface PlayerApiRead {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  jersey_number: number;
  position: string;
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
