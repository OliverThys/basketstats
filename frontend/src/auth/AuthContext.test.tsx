import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AuthProvider, useAuth } from "./AuthContext";

const cachedUser = {
  id: "user-1",
  org_id: "org-1",
  email: "coach@example.com",
  display_name: "Coach",
  role: "owner" as const,
};

vi.mock("../api/http", () => ({
  ApiError: class ApiError extends Error {
    constructor(message: string, public status: number) {
      super(message);
    }
  },
  getToken: () => "cached-token",
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getStoredUser: () => cachedUser,
  setStoredUser: vi.fn(),
}));

vi.mock("../api/auth", () => ({
  fetchCurrentUser: () => Promise.reject(new TypeError("Failed to fetch")),
  login: vi.fn(),
  logout: vi.fn(),
  registerOrganization: vi.fn(),
  inviteUser: vi.fn(),
}));

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{user ? `logged in as ${user.email}` : "logged out"}</p>;
}

describe("AuthProvider", () => {
  it("keeps the cached user logged in when the background refresh fails offline", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    // Renders from the cache immediately: no network round-trip needed to
    // show the offline-first live entry screen.
    expect(screen.getByText("logged in as coach@example.com")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("logged in as coach@example.com")).toBeInTheDocument();
    });
  });
});
