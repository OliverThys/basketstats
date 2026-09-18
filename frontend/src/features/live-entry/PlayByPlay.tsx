import { useState } from "react";

import { ACTION_LABELS } from "../../domain/actionTypes";
import type { CachedPlayer } from "../../offline/db";
import type { LocalGameEvent } from "../../offline/db";

const PERIOD_LABELS: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT" };

interface PlayByPlayProps {
  events: LocalGameEvent[];
  players: CachedPlayer[];
  opponentName: string;
  onVoid: (eventId: string) => void;
  onUndoLast: () => void;
}

function describeEvent(event: LocalGameEvent, playersById: Map<string, CachedPlayer>, opponentName: string): string {
  const label = ACTION_LABELS[event.actionType];
  if (event.actor === "opponent_team") {
    return `${opponentName} - ${label}`;
  }
  const player = event.playerId ? playersById.get(event.playerId) : undefined;
  const name = player ? `${player.firstName} ${player.lastName}` : "Joueur inconnu";
  return `${name} - ${label}`;
}

export function PlayByPlay({ events, players, opponentName, onVoid, onUndoLast }: PlayByPlayProps) {
  const [editing, setEditing] = useState(false);
  const playersById = new Map(players.map((player) => [player.id, player]));
  const visibleEvents = [...events].sort((a, b) => b.seq - a.seq);
  const hasActiveEvents = events.some((event) => !event.voided);

  return (
    <section className="play-by-play">
      <header>
        <h3>Actions</h3>
        <div className="header-actions">
          <button className="undo-last" disabled={!hasActiveEvents} onClick={onUndoLast}>
            Annuler
          </button>
          <button className="edit-btn" onClick={() => setEditing((prev) => !prev)}>{editing ? "Terminer" : "Modifier"}</button>
        </div>
      </header>
      <ul>
        {visibleEvents.map((event) => (
          <li key={event.id} className={event.voided ? "voided" : ""}>
            <span className="period-badge">{PERIOD_LABELS[event.period] ?? event.period}</span>
            <span className="event-description">{describeEvent(event, playersById, opponentName)}</span>
            {editing && !event.voided && (
              <button className="void-button" onClick={() => onVoid(event.id)}>
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
