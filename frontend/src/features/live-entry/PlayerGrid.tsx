import type { CachedPlayer, CachedRosterEntry } from "../../offline/db";

interface PlayerGridProps {
  players: CachedPlayer[];
  roster: CachedRosterEntry[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
  onCourtIds: Set<string>;
  subMode?: boolean;
  subOutId?: string | null;
  subInId?: string | null;
}

export function PlayerGrid({
  players,
  roster,
  selectedPlayerId,
  onSelect,
  onCourtIds,
  subMode = false,
  subOutId = null,
  subInId = null,
}: PlayerGridProps) {
  const playersById = new Map(players.map((player) => [player.id, player]));
  const activeRoster = roster
    .filter((entry) => !entry.dnp)
    .slice()
    .sort((a, b) => {
      const jerseyA = playersById.get(a.playerId)?.jerseyNumber ?? Number.POSITIVE_INFINITY;
      const jerseyB = playersById.get(b.playerId)?.jerseyNumber ?? Number.POSITIVE_INFINITY;
      return jerseyA - jerseyB;
    });

  return (
    <div className="player-list">
      {activeRoster.map((entry) => {
        const player = playersById.get(entry.playerId);
        if (!player) return null;
        const onCourt = onCourtIds.has(entry.playerId);
        const classes = ["player-list-item"];
        if (onCourt) classes.push("on-court");
        if (subMode) {
          if (entry.playerId === subOutId) classes.push("sub-out");
          if (entry.playerId === subInId) classes.push("sub-in");
        } else if (selectedPlayerId === entry.playerId) {
          classes.push("selected");
        }
        return (
          <button
            key={entry.playerId}
            className={classes.join(" ")}
            onClick={() => onSelect(entry.playerId)}
            title={onCourt ? "Sur le terrain" : "Sur le banc"}
          >
            <span className="jersey">{player.jerseyNumber}</span>
            <span className="name">
              {player.firstName} {player.lastName}
            </span>
          </button>
        );
      })}
      {activeRoster.length === 0 && (
        <p className="player-list-empty">Aucune joueuse sur la feuille de match.</p>
      )}
    </div>
  );
}
