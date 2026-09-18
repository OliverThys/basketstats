import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchHealth } from "./api/client";
import { LiveGameScreen } from "./features/live-entry/LiveGameScreen";

function readGameIdFromUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get("game");
  return value?.trim() ? value.trim() : null;
}

function writeGameIdToUrl(gameId: string | null) {
  const url = new URL(window.location.href);
  if (gameId) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function GameLoader({ onOpen }: { onOpen: (gameId: string) => void }) {
  const [gameId, setGameId] = useState("");

  return (
    <main className="app-shell">
      <h1>BasketStats</h1>
      <p>FIBA basketball stats, offline-first.</p>
      <ApiStatus />
      <form
        className="game-loader"
        onSubmit={(event) => {
          event.preventDefault();
          if (gameId.trim()) onOpen(gameId.trim());
        }}
      >
        <label htmlFor="game-id">Game ID</label>
        <input
          id="game-id"
          value={gameId}
          onChange={(event) => setGameId(event.target.value)}
          placeholder="Paste a game ID (see scripts/seed_demo.py)"
        />
        <button type="submit">Open live entry</button>
      </form>
    </main>
  );
}

function ApiStatus() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });
  return (
    <p data-testid="api-status">
      API status: {isLoading ? "checking..." : isError ? "unreachable" : data?.status}
    </p>
  );
}

function App() {
  const [gameId, setGameId] = useState<string | null>(() => readGameIdFromUrl());

  function openGame(id: string) {
    writeGameIdToUrl(id);
    setGameId(id);
  }

  function closeGame() {
    writeGameIdToUrl(null);
    setGameId(null);
  }

  if (gameId) {
    return <LiveGameScreen gameId={gameId} onDone={closeGame} />;
  }

  return <GameLoader onOpen={openGame} />;
}

export default App;
