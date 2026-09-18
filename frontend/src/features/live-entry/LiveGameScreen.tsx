import { useEffect, useMemo, useReducer, useState } from "react";

import { fetchTeam } from "../../api/stats";
import { ActionType } from "../../domain/actionTypes";
import { ActionButtons } from "./ActionButtons";
import { BoxScoreModal } from "./BoxScoreModal";
import { entryReducer, initialEntryState, isReadyForImmediateEvent } from "./entryReducer";
import { Modal } from "./Modal";
import { OpponentButtons } from "./OpponentButtons";
import { PersonalFouls } from "./PersonalFouls";
import { PlayByPlay } from "./PlayByPlay";
import { PlayerGrid } from "./PlayerGrid";
import { Scoreboard } from "./Scoreboard";
import { ShotChartView } from "../shot-chart/ShotChartView";
import { extractShotEntries } from "../shot-chart/shotFilters";
import { ShotPad } from "./ShotPad";
import { StatsPanel } from "./StatsPanel";
import { SyncBadge } from "./SyncBadge";
import { useLiveGame } from "./useLiveGame";

interface LiveGameScreenProps {
  gameId: string;
  onDone: () => void;
  onOpenSeason?: (teamId: string) => void;
}

export function LiveGameScreen({ gameId, onDone, onOpenSeason }: LiveGameScreenProps) {
  const { game, players, roster, events, loadError, syncStatus, recordEvent, voidEvent, undoLast } =
    useLiveGame(gameId);
  const [entry, dispatch] = useReducer(entryReducer, initialEntryState);
  const [period, setPeriod] = useState(1);
  const [modal, setModal] = useState<null | "box-score" | "shot-chart" | "sketch-board">(null);
  const [homeTeamName, setHomeTeamName] = useState("Domicile");
  const shotMarkers = useMemo(
    () => extractShotEntries(events).map((shot) => ({ id: shot.id, x: shot.x, y: shot.y, made: shot.made })),
    [events],
  );

  useEffect(() => {
    if (!isReadyForImmediateEvent(entry)) return;
    void (async () => {
      await recordEvent({
        actor: "home_player",
        actionType: entry.selectedAction,
        playerId: entry.selectedPlayerId,
        period,
      });
      dispatch({ type: "RESET" });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.selectedAction, entry.selectedPlayerId]);

  useEffect(() => {
    if (!game) return;
    let cancelled = false;
    void fetchTeam(game.homeTeamId)
      .then((team) => {
        if (!cancelled) setHomeTeamName(team.name);
      })
      .catch(() => {
        // Offline or unreachable: keep the "Domicile" fallback.
      });
    return () => {
      cancelled = true;
    };
  }, [game?.homeTeamId]);

  if (loadError) {
    return (
      <div className="live-game-error">
        <p>{loadError}</p>
        <button onClick={onDone}>Retour</button>
      </div>
    );
  }

  if (!game) {
    return <div className="live-game-loading">Chargement du match…</div>;
  }

  async function completeShot(x: number, y: number) {
    if (!entry.pendingShot) return;
    await recordEvent({
      actor: "home_player",
      actionType: entry.pendingShot.action,
      playerId: entry.pendingShot.playerId,
      period,
      x,
      y,
    });
    dispatch({ type: "RESET" });
  }

  async function recordOpponentEvent(action: ActionType) {
    await recordEvent({ actor: "opponent_team", actionType: action, playerId: null, period });
  }

  function handleSelectAction(action: ActionType) {
    dispatch({ type: "SELECT_ACTION", action });
  }

  function handleSelectPlayer(playerId: string) {
    dispatch({ type: "SELECT_PLAYER", playerId });
  }

  const stepLabel = entry.pendingShot
    ? "2ème étape: touchez l'emplacement du tir"
    : entry.selectedAction || entry.selectedPlayerId
      ? "2ème étape: sélectionnez l'autre"
      : "";

  return (
    <div className="live-game-frame">
      <div className="live-game-screen">
        <header className="live-game-header">
          <button className="header-btn" onClick={onDone}>Terminer</button>
          <h2>{game.label ?? "Match en direct"}</h2>
          <div className="live-game-actions">
            {onOpenSeason && (
              <button className="header-btn" onClick={() => onOpenSeason(game.homeTeamId)}>Saison</button>
            )}
            <button className="header-btn" onClick={() => setModal("sketch-board")}>Tableau</button>
            <button className="header-btn" onClick={() => setModal("shot-chart")}>Tirs</button>
            <button className="header-btn" onClick={() => setModal("box-score")}>Stats</button>
            <SyncBadge status={syncStatus} />
          </div>
        </header>

        <div className="live-game-columns">
          <div className="live-game-main">
            <div className="live-game-top-row">
              <PlayByPlay events={events} players={players} opponentName={game.opponentName} onVoid={voidEvent} onUndoLast={undoLast} />
              <Scoreboard
                homeTeamName={homeTeamName}
                opponentName={game.opponentName}
                events={events}
                period={period}
                onSelectPeriod={setPeriod}
                stepLabel={stepLabel}
              />
            </div>

            {entry.pendingShot ? (
              <div className="shot-capture">
                <p>Touchez le terrain pour enregistrer l'emplacement du tir</p>
                <div className="shot-capture-court">
                  <ShotPad markers={shotMarkers} onPick={(x, y) => void completeShot(x, y)} />
                </div>
                <button className="cancel-btn" onClick={() => dispatch({ type: "RESET" })}>Annuler</button>
              </div>
            ) : (
              <>
                <ActionButtons selectedAction={entry.selectedAction} onSelect={handleSelectAction} />

                <div className="live-game-bottom-row">
                  <PlayerGrid
                    players={players}
                    roster={roster}
                    selectedPlayerId={entry.selectedPlayerId}
                    onSelect={handleSelectPlayer}
                  />
                  <div className="side-actions">
                    <PersonalFouls selectedAction={entry.selectedAction} onSelect={handleSelectAction} />
                    <OpponentButtons opponentName={game.opponentName} onScore={(action) => void recordOpponentEvent(action)} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="live-game-sidebar">
            <StatsPanel events={events} players={players} />
            <div className="shot-chart-mini">
              <ShotPad markers={shotMarkers} interactive={false} />
            </div>
          </div>
        </div>

        {modal === "box-score" && (
          <BoxScoreModal
            gameId={gameId}
            events={events}
            players={players}
            roster={roster}
            onClose={() => setModal(null)}
          />
        )}
        {modal === "shot-chart" && <ShotChartView events={events} players={players} onClose={() => setModal(null)} />}
        {modal === "sketch-board" && (
          <Modal title="Tableau Tactique" onClose={() => setModal(null)}>
            <p>Bientôt disponible.</p>
          </Modal>
        )}
      </div>
    </div>
  );
}
