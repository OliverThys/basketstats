import type { CachedPlayer, CachedRosterEntry } from "../../offline/db";

interface PlayerGridProps {
  players: CachedPlayer[];
  roster: CachedRosterEntry[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
}

export function PlayerGrid({ players, roster, selectedPlayerId, onSelect }: PlayerGridProps) {
  const activeRoster = roster.filter((entry) => !entry.dnp);
  const playersById = new Map(players.map((player) => [player.id, player]));

  return (
    <div className="player-grid">
      {activeRoster.map((entry) => {
        const player = playersById.get(entry.playerId);
        if (!player) return null;
        return (
          <button
            key={entry.playerId}
            className={selectedPlayerId === entry.playerId ? "player-button selected" : "player-button"}
            onClick={() => onSelect(entry.playerId)}
          >
            <span className="jersey">{player.jerseyNumber}</span>
            <span className="name">
              {player.firstName} {player.lastName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
