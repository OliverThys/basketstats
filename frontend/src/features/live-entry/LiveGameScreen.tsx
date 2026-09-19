import { useEffect, useMemo, useReducer, useRef, useState } from "react";

import { fetchTeam } from "../../api/stats";
import { ActionType } from "../../domain/actionTypes";
import { formatClock } from "../../domain/boxScore";
import { computeOnCourtIds } from "../../domain/lineup";
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
import { useGameClock } from "./useGameClock";
import { useLiveGame } from "./useLiveGame";

interface LiveGameScreenProps {
  gameId: string;
  onDone: () => void;
  onOpenSeason?: (teamId: string) => void;
}

export function LiveGameScreen({ gameId, onDone, onOpenSeason }: LiveGameScreenProps) {
  const { game, players, roster, events, loadError, syncStatus, recordEvent, recordEvents, voidEvent, undoLast } =
    useLiveGame(gameId);
  const [entry, dispatch] = useReducer(entryReducer, initialEntryState);
  const [period, setPeriod] = useState(1);
  const [modal, setModal] = useState<null | "box-score" | "shot-chart" | "sketch-board">(null);
  const [homeTeamName, setHomeTeamName] = useState("Domicile");
  const clock = useGameClock(gameId, period);
  const [subMode, setSubMode] = useState(false);
  const [subOutId, setSubOutId] = useState<string | null>(null);
  const [subInId, setSubInId] = useState<string | null>(null);
  const shotMarkers = useMemo(
    () => extractShotEntries(events).map((shot) => ({ id: shot.id, x: shot.x, y: shot.y, made: shot.made })),
    [events],
  );
  const starterIds = useMemo(
    () =>
      roster
        .filter((rosterEntry) => rosterEntry.isStarter && !rosterEntry.dnp)
        .map((rosterEntry) => rosterEntry.playerId),
    [roster],
  );
  const onCourtIds = useMemo(() => computeOnCourtIds(starterIds, events), [starterIds, events]);
  const benchCount = roster.filter((entry) => !entry.dnp && !onCourtIds.has(entry.playerId)).length;
  const recordInFlight = useRef(false);
  const subInFlight = useRef(false);

  useEffect(() => {
    if (!isReadyForImmediateEvent(entry)) return;
    // A tap that lands while the previous write is still in flight must not
    // produce a second event: in live entry a duplicated stat is worse than a
    // dropped tap, because nobody notices it until the box score is wrong.
    if (recordInFlight.current) return;
    recordInFlight.current = true;
    void (async () => {
      try {
        await recordEvent({
          actor: "home_player",
          actionType: entry.selectedAction,
          playerId: entry.selectedPlayerId,
          period,
          gameClock: formatClock(clock.remainingS),
        });
      } catch (error) {
        // Surface it instead of leaving the selection stuck forever with
        // nothing recorded and no visible sign anything went wrong.
        console.error("Failed to record event", error);
      } finally {
        recordInFlight.current = false;
        dispatch({ type: "RESET" });
      }
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
    try {
      await recordEvent({
        actor: "home_player",
        actionType: entry.pendingShot.action,
        playerId: entry.pendingShot.playerId,
        period,
        gameClock: formatClock(clock.remainingS),
        x,
        y,
      });
    } catch (error) {
      console.error("Failed to record shot", error);
    }
    dispatch({ type: "RESET" });
  }

  async function recordOpponentEvent(action: ActionType) {
    try {
      await recordEvent({
        actor: "opponent_team",
        actionType: action,
        playerId: null,
        period,
        gameClock: formatClock(clock.remainingS),
      });
    } catch (error) {
      console.error("Failed to record opponent event", error);
    }
  }

  function handleSelectAction(action: ActionType) {
    dispatch({ type: "SELECT_ACTION", action });
  }

  function handleSelectPlayer(playerId: string) {
    dispatch({ type: "SELECT_PLAYER", playerId });
  }

  /** Records the outgoing/incoming pair together, stamped with the same clock
   * reading, then clears the selection but stays in substitution mode: at a
   * dead ball a coach usually makes two or three changes in a row. */
  async function recordSubstitution(outId: string, inId: string) {
    if (subInFlight.current) return;
    subInFlight.current = true;
    const clockNow = formatClock(clock.remainingS);
    try {
      await recordEvents([
        { actor: "home_player", actionType: ActionType.SUB_OUT, playerId: outId, period, gameClock: clockNow },
        { actor: "home_player", actionType: ActionType.SUB_IN, playerId: inId, period, gameClock: clockNow },
      ]);
    } catch (error) {
      console.error("Failed to record substitution", error);
    } finally {
      subInFlight.current = false;
      setSubOutId(null);
      setSubInId(null);
    }
  }

  function handlePlayerClick(playerId: string) {
    if (!subMode) {
      handleSelectPlayer(playerId);
      return;
    }
    // Which side of the change a tap means is decided by where the player
    // currently is, so the coach never has to pick "out" or "in" first.
    if (onCourtIds.has(playerId)) {
      const nextOut = subOutId === playerId ? null : playerId;
      setSubOutId(nextOut);
      if (nextOut && subInId) void recordSubstitution(nextOut, subInId);
      return;
    }
    const nextIn = subInId === playerId ? null : playerId;
    setSubInId(nextIn);
    if (nextIn && subOutId) void recordSubstitution(subOutId, nextIn);
  }

  function toggleSubMode() {
    setSubMode((prev) => !prev);
    setSubOutId(null);
    setSubInId(null);
    dispatch({ type: "RESET" });
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
                  <div className="player-section">
                    <div className="player-section-header">
                      <div className="game-clock">
                        <span className="game-clock-time">{formatClock(clock.remainingS)}</span>
                        <button
                          type="button"
                          className={clock.running ? "header-btn active" : "header-btn"}
                          onClick={clock.running ? clock.pause : clock.play}
                        >
                          {clock.running ? "Pause" : "Lecture"}
                        </button>
                        <button type="button" className="header-btn" onClick={clock.reset}>
                          Reset
                        </button>
                      </div>
                      <div className="lineup-controls">
                        <span className="lineup-count">Sur le terrain : {onCourtIds.size}/5</span>
                        <button
                          type="button"
                          className={subMode ? "header-btn active" : "header-btn"}
                          onClick={toggleSubMode}
                          disabled={!subMode && benchCount === 0}
                          title={
                            benchCount === 0 ? "Aucune joueuse sur le banc" : "Enregistrer un changement"
                          }
                        >
                          {subMode ? "Terminer le changement" : "Changement"}
                        </button>
                      </div>
                    </div>
                    {subMode && (
                      <p className="sub-mode-hint">
                        {subOutId
                          ? "Touchez maintenant une joueuse sur le banc (entrée)."
                          : subInId
                            ? "Touchez maintenant une joueuse sur le terrain (sortie)."
                            : "Touchez une joueuse sur le terrain (sortie), puis une joueuse sur le banc (entrée)."}
                      </p>
                    )}
                    <PlayerGrid
                      players={players}
                      roster={roster}
                      selectedPlayerId={entry.selectedPlayerId}
                      onSelect={handlePlayerClick}
                      onCourtIds={onCourtIds}
                      subMode={subMode}
                      subOutId={subOutId}
                      subInId={subInId}
                    />
                  </div>
                  <div className="side-actions">
                    <PersonalFouls selectedAction={entry.selectedAction} onSelect={handleSelectAction} />
                    <OpponentButtons opponentName={game.opponentName} onScore={(action) => void recordOpponentEvent(action)} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="live-game-sidebar">
            <StatsPanel
              events={events}
              players={players}
              starterIds={starterIds}
              onCourtIds={onCourtIds}
              liveClock={{ period, remainingS: clock.remainingS }}
            />
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
