import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchHealth } from "./api/client";
import { LiveGameScreen } from "./features/live-entry/LiveGameScreen";
import { SeasonStatsScreen } from "./features/stats/SeasonStatsScreen";

function readParam(name: string): string | null {
  const value = new URLSearchParams(window.location.search).get(name);
  return value?.trim() ? value.trim() : null;
}

function writeParams(gameId: string | null, teamId: string | null) {
  const url = new URL(window.location.href);
  if (gameId) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");
  if (teamId) url.searchParams.set("team", teamId);
  else url.searchParams.delete("team");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function GameLoader({
  onOpenGame,
  onOpenSeason,
}: {
  onOpenGame: (gameId: string) => void;
  onOpenSeason: (teamId: string) => void;
}) {
  const [gameId, setGameId] = useState("");
  const [teamId, setTeamId] = useState("");

  return (
    <main className="app-shell">
      <h1>BasketStats</h1>
      <p>Statistiques de basketball FIBA, hors ligne d'abord.</p>
      <ApiStatus />
      <form
        className="game-loader"
        onSubmit={(event) => {
          event.preventDefault();
          if (gameId.trim()) onOpenGame(gameId.trim());
        }}
      >
        <label htmlFor="game-id">ID du match</label>
        <input
          id="game-id"
          value={gameId}
          onChange={(event) => setGameId(event.target.value)}
          placeholder="Collez un ID de match"
        />
        <button type="submit">Ouvrir le match</button>
      </form>
      <form
        className="game-loader"
        onSubmit={(event) => {
          event.preventDefault();
          if (teamId.trim()) onOpenSeason(teamId.trim());
        }}
      >
        <label htmlFor="team-id">ID de l'équipe</label>
        <input
          id="team-id"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          placeholder="Collez un ID d'équipe pour la saison"
        />
        <button type="submit">Stats de la saison</button>
      </form>
    </main>
  );
}

function ApiStatus() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["health"], queryFn: fetchHealth });
  return (
    <p data-testid="api-status">
      Statut API: {isLoading ? "vérification..." : isError ? "inaccessible" : data?.status}
    </p>
  );
}

function App() {
  const [gameId, setGameId] = useState<string | null>(() => readParam("game"));
  const [teamId, setTeamId] = useState<string | null>(() => (readParam("game") ? null : readParam("team")));

  function openGame(id: string) {
    writeParams(id, null);
    setTeamId(null);
    setGameId(id);
  }

  function openSeason(id: string) {
    writeParams(null, id);
    setGameId(null);
    setTeamId(id);
  }

  function closeToHome() {
    writeParams(null, null);
    setGameId(null);
    setTeamId(null);
  }

  if (gameId) {
    return <LiveGameScreen gameId={gameId} onDone={closeToHome} onOpenSeason={openSeason} />;
  }

  if (teamId) {
    return <SeasonStatsScreen teamId={teamId} onBack={closeToHome} />;
  }

  return <GameLoader onOpenGame={openGame} onOpenSeason={openSeason} />;
}

export default App;
