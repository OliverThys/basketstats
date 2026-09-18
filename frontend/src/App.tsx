import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchHealth } from "./api/client";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginScreen } from "./features/auth/LoginScreen";
import { LiveGameScreen } from "./features/live-entry/LiveGameScreen";
import { ManagementScreen } from "./features/management/ManagementScreen";
import { LiveSpectatorScreen } from "./features/spectator/LiveSpectatorScreen";
import { SeasonStatsScreen } from "./features/stats/SeasonStatsScreen";

function readParam(name: string): string | null {
  const value = new URLSearchParams(window.location.search).get(name);
  return value?.trim() ? value.trim() : null;
}

function writeParams(gameId: string | null, teamId: string | null, manage?: boolean) {
  const url = new URL(window.location.href);
  if (gameId) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");
  if (teamId) url.searchParams.set("team", teamId);
  else url.searchParams.delete("team");
  if (manage) url.searchParams.set("manage", "1");
  else url.searchParams.delete("manage");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function GameLoader({
  onOpenGame,
  onOpenSeason,
  onOpenManagement,
}: {
  onOpenGame: (gameId: string) => void;
  onOpenSeason: (teamId: string) => void;
  onOpenManagement: () => void;
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
      <p className="game-loader">
        <button onClick={onOpenManagement}>Gérer les équipes, joueurs et matchs</button>
      </p>
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

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [gameId, setGameId] = useState<string | null>(() => readParam("game"));
  const [teamId, setTeamId] = useState<string | null>(() =>
    readParam("game") ? null : readParam("team"),
  );
  const [managing, setManaging] = useState<boolean>(() => readParam("manage") === "1");

  function openGame(id: string) {
    writeParams(id, null);
    setTeamId(null);
    setManaging(false);
    setGameId(id);
  }

  function openSeason(id: string) {
    writeParams(null, id);
    setGameId(null);
    setManaging(false);
    setTeamId(id);
  }

  function openManagement() {
    writeParams(null, null, true);
    setGameId(null);
    setTeamId(null);
    setManaging(true);
  }

  function closeToHome() {
    writeParams(null, null);
    setGameId(null);
    setTeamId(null);
    setManaging(false);
  }

  if (loading) {
    return (
      <main className="app-shell">
        <p>Chargement...</p>
      </main>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (gameId) {
    return <LiveGameScreen gameId={gameId} onDone={closeToHome} onOpenSeason={openSeason} />;
  }

  if (teamId) {
    return <SeasonStatsScreen teamId={teamId} onBack={closeToHome} />;
  }

  if (managing) {
    return (
      <ManagementScreen onBack={closeToHome} onOpenGame={openGame} onOpenSeason={openSeason} />
    );
  }

  return (
    <GameLoader onOpenGame={openGame} onOpenSeason={openSeason} onOpenManagement={openManagement} />
  );
}

function App() {
  const shareToken = readParam("live");
  if (shareToken) {
    return <LiveSpectatorScreen shareToken={shareToken} />;
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
