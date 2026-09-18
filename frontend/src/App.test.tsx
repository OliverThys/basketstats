import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./api/client", () => ({
  fetchHealth: () => Promise.resolve({ status: "ok" }),
}));

vi.mock("./api/http", () => ({
  API_BASE_URL: "http://localhost:8000",
  getToken: () => "fake-token",
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getStoredUser: () => null,
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

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("App", () => {
  it("renders the app title", async () => {
    renderWithClient(<App />);
    expect(await screen.findByText("BasketStats")).toBeInTheDocument();
  });

  it("displays the API status once loaded", async () => {
    renderWithClient(<App />);
    expect(await screen.findByText(/Statut API: ok/)).toBeInTheDocument();
  });

  it("offers a team ID field for season stats", async () => {
    renderWithClient(<App />);
    expect(await screen.findByLabelText("ID de l'équipe")).toBeInTheDocument();
    expect(screen.getByText("Stats de la saison")).toBeInTheDocument();
  });
});
