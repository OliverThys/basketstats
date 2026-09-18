import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

vi.mock("./api/client", () => ({
  fetchHealth: () => Promise.resolve({ status: "ok" }),
}));

function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("App", () => {
  it("renders the app title", () => {
    renderWithClient(<App />);
    expect(screen.getByText("BasketStats")).toBeInTheDocument();
  });

  it("displays the API status once loaded", async () => {
    renderWithClient(<App />);
    expect(await screen.findByText(/Statut API: ok/)).toBeInTheDocument();
  });

  it("offers a team ID field for season stats", () => {
    renderWithClient(<App />);
    expect(screen.getByLabelText("ID de l'équipe")).toBeInTheDocument();
    expect(screen.getByText("Stats de la saison")).toBeInTheDocument();
  });
});
