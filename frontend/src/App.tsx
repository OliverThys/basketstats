import { useState } from "react";

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

function writeParams(gameId: string | null, teamId: string | null) {
  const url = new URL(window.location.href);
  if (gameId) url.searchParams.set("game", gameId);
  else url.searchParams.delete("game");
  if (teamId) url.searchParams.set("team", teamId);
  else url.searchParams.delete("team");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [gameId, setGameId] = useState<string | null>(() => readParam("game"));
  const [teamId, setTeamId] = useState<string | null>(() =>
    readParam("game") ? null : readParam("team"),
  );

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

  function closeToManagement() {
    writeParams(null, null);
    setGameId(null);
    setTeamId(null);
  }

  if (loading) {
    return (
      <div className="app-frame">
        <div className="app-screen app-screen-loading">
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (gameId) {
    return <LiveGameScreen gameId={gameId} onDone={closeToManagement} onOpenSeason={openSeason} />;
  }

  if (teamId) {
    return <SeasonStatsScreen teamId={teamId} onBack={closeToManagement} />;
  }

  return <ManagementScreen onOpenGame={openGame} onOpenSeason={openSeason} />;
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
