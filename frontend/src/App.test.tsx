import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";
import { getToken, getStoredUser } from "./api/http";

vi.mock("./api/http", () => ({
  API_BASE_URL: "http://localhost:8000",
  getToken: vi.fn(() => "fake-token"),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getStoredUser: vi.fn(() => null),
  setStoredUser: vi.fn(),
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
}));

vi.mock("./api/auth", () => ({
  fetchCurrentUser: () =>
    Promise.resolve({
      id: "user-1",
      org_id: "org-1",
      email: "coach@example.com",
      display_name: "Coach",
      role: "owner",
    }),
  login: vi.fn(),
  logout: vi.fn(),
  registerOrganization: vi.fn(),
  inviteUser: vi.fn(),
}));

vi.mock("./api/teams", () => ({
  fetchTeams: vi.fn(() => Promise.resolve([])),
  createTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
}));

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("App", () => {
  it("goes straight to the club management screen once authenticated (no landing page)", async () => {
    renderWithClient(<App />);
    expect(await screen.findByText("Gestion du club")).toBeInTheDocument();
  });

  it("shows the login screen when there is no active session", async () => {
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(getStoredUser).mockReturnValue(null);
    renderWithClient(<App />);
    expect(await screen.findByLabelText("E-mail")).toBeInTheDocument();
  });
});
