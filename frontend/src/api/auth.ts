import { apiFetch, clearToken, setToken } from "./http";

export type UserRole = "owner" | "head_coach" | "assistant" | "viewer";

export interface CurrentUser {
  id: string;
  org_id: string;
  email: string;
  display_name: string;
  role: UserRole;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function registerOrganization(
  orgName: string,
  email: string,
  displayName: string,
): Promise<void> {
  const response = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ org_name: orgName, email, display_name: displayName }),
  });
  setToken(response.access_token);
}

export async function login(email: string): Promise<void> {
  const response = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  setToken(response.access_token);
}

export function logout(): void {
  clearToken();
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/me");
}

export async function inviteUser(
  email: string,
  displayName: string,
  role: UserRole,
): Promise<CurrentUser> {
  return apiFetch<CurrentUser>("/auth/invite", {
    method: "POST",
    body: JSON.stringify({ email, display_name: displayName, role }),
  });
}
