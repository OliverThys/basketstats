import { useEffect, useMemo, useReducer, useState } from "react";

import { ActionType } from "../../domain/actionTypes";
import { ActionButtons } from "./ActionButtons";
import { BoxScoreModal } from "./BoxScoreModal";
import { entryReducer, initialEntryState, isReadyForImmediateEvent } from "./entryReducer";
import { Modal } from "./Modal";
import { OpponentButtons } from "./OpponentButtons";
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

  if (loadError) {
    return (
      <div className="live-game-error">
        <p>{loadError}</p>
        <button onClick={onDone}>Back</button>
      </div>
    );
  }

  if (!game) {
    return <div className="live-game-loading">Loading game…</div>;
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
    ? "2nd Step: tap the shot location"
    : entry.selectedAction || entry.selectedPlayerId
      ? "2nd Step: select the other one"
      : "1st Step: select player or stat";

  return (
    <div className="live-game-screen">
      <header className="live-game-header">
        <button onClick={onDone}>Done</button>
        <h2>{game.label ?? "Live Game"}</h2>
        <div className="live-game-actions">
          {onOpenSeason && (
            <button onClick={() => onOpenSeason(game.homeTeamId)}>Season</button>
          )}
          <button onClick={() => setModal("sketch-board")}>Sketch Board</button>
          <button onClick={() => setModal("shot-chart")}>Shot Chart</button>
          <button onClick={() => setModal("box-score")}>Box Score</button>
          <SyncBadge status={syncStatus} />
        </div>
      </header>

      <div className="live-game-body">
        <PlayByPlay events={events} players={players} opponentName={game.opponentName} onVoid={voidEvent} onUndoLast={undoLast} />

        <div className="live-game-center">
          <Scoreboard
            homeTeamName="Home"
            opponentName={game.opponentName}
            events={events}
            period={period}
            onSelectPeriod={setPeriod}
            stepLabel={stepLabel}
          />

          {entry.pendingShot ? (
            <div className="shot-capture">
              <p>Tap the court to record the shot location</p>
              <ShotPad markers={shotMarkers} onPick={(x, y) => void completeShot(x, y)} />
              <button onClick={() => dispatch({ type: "RESET" })}>Cancel</button>
            </div>
          ) : (
            <>
              <ActionButtons selectedAction={entry.selectedAction} onSelect={handleSelectAction} />
              <OpponentButtons onScore={(action) => void recordOpponentEvent(action)} />
              <PlayerGrid
                players={players}
                roster={roster}
                selectedPlayerId={entry.selectedPlayerId}
                onSelect={handleSelectPlayer}
              />
            </>
          )}
        </div>

        <StatsPanel events={events} players={players} />
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
        <Modal title="Sketch Board" onClose={() => setModal(null)}>
          <p>Coming soon.</p>
        </Modal>
      )}
    </div>
  );
}
