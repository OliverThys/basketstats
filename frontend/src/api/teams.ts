import { apiFetch } from "./http";

export interface TeamApi {
  id: string;
  org_id: string;
  name: string;
}

export async function fetchTeams(search?: string): Promise<TeamApi[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<TeamApi[]>(`/teams${query}`);
}

export async function createTeam(name: string): Promise<TeamApi> {
  return apiFetch<TeamApi>("/teams", { method: "POST", body: JSON.stringify({ name }) });
}

export async function updateTeam(teamId: string, name: string): Promise<TeamApi> {
  return apiFetch<TeamApi>(`/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteTeam(teamId: string): Promise<void> {
  await apiFetch<void>(`/teams/${teamId}`, { method: "DELETE" });
}
