import { useEffect, useState } from "react";

import { createGame, fetchTeamGames } from "../../api/games";
import type { GameApiRead } from "../../api/games";
import {
  createPlayer,
  deletePlayer,
  fetchTeamPlayersDetailed,
  updatePlayer,
} from "../../api/players";
import type { PlayerApiRead } from "../../api/players";
import { createTeam, deleteTeam, fetchTeams, updateTeam } from "../../api/teams";
import type { TeamApi } from "../../api/teams";
import { useAuth } from "../../auth/AuthContext";
import { Modal } from "../live-entry/Modal";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

interface ManagementScreenProps {
  onOpenGame: (gameId: string) => void;
  onOpenSeason: (teamId: string) => void;
}

export function ManagementScreen({ onOpenGame, onOpenSeason }: ManagementScreenProps) {
  const { user, logout } = useAuth();
  const canWrite = user?.role !== "viewer";

  const [teams, setTeams] = useState<TeamApi[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamApi | null>(null);
  const [tab, setTab] = useState<"players" | "games">("players");

  async function reloadTeams(search?: string) {
    const list = await fetchTeams(search);
    setTeams(list);
    if (list.length > 0 && !selectedTeamId) {
      setSelectedTeamId(list[0].id);
    }
  }

  useEffect(() => {
    void reloadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void reloadTeams(teamSearch), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSearch]);

  async function handleSaveTeam(name: string) {
    if (editingTeam) {
      await updateTeam(editingTeam.id, name);
    } else {
      const created = await createTeam(name);
      setSelectedTeamId(created.id);
    }
    setTeamModalOpen(false);
    setEditingTeam(null);
    await reloadTeams(teamSearch);
  }

  async function handleDeleteTeam(team: TeamApi) {
    if (!confirm(`Supprimer l'équipe "${team.name}" et toutes ses données ?`)) return;
    await deleteTeam(team.id);
    if (selectedTeamId === team.id) setSelectedTeamId(null);
    await reloadTeams(teamSearch);
  }

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;

  return (
    <div className="app-frame">
      <div className="app-screen management-screen">
        <header className="app-screen-header">
          <h1>Gestion du club</h1>
          <div className="app-screen-header-actions">
            <button className="header-btn" onClick={logout}>
              Déconnexion
            </button>
          </div>
        </header>

        <div className="management-layout">
          <section className="management-teams">
            <div className="management-toolbar">
              <input
                placeholder="Rechercher une équipe..."
                value={teamSearch}
                onChange={(event) => setTeamSearch(event.target.value)}
              />
              {canWrite && (
                <button
                  className="header-btn"
                  onClick={() => {
                    setEditingTeam(null);
                    setTeamModalOpen(true);
                  }}
                >
                  + Équipe
                </button>
              )}
            </div>
            <ul className="management-list">
              {teams.map((team) => (
                <li
                  key={team.id}
                  className={team.id === selectedTeamId ? "selected" : ""}
                  onClick={() => setSelectedTeamId(team.id)}
                >
                  <span>{team.name}</span>
                  {canWrite && (
                    <span className="management-item-actions">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingTeam(team);
                          setTeamModalOpen(true);
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteTeam(team);
                        }}
                      >
                        Supprimer
                      </button>
                    </span>
                  )}
                </li>
              ))}
              {teams.length === 0 && <li className="management-empty">Aucune équipe</li>}
            </ul>
          </section>

          <section className="management-detail">
            {!selectedTeam ? (
              <p>Sélectionnez ou créez une équipe.</p>
            ) : (
              <>
                <div className="management-tabs">
                  <button
                    className={tab === "players" ? "active" : ""}
                    onClick={() => setTab("players")}
                  >
                    Joueurs
                  </button>
                  <button className={tab === "games" ? "active" : ""} onClick={() => setTab("games")}>
                    Matchs
                  </button>
                  <button className="header-btn" onClick={() => onOpenSeason(selectedTeam.id)}>
                    Stats de saison
                  </button>
                </div>
                {tab === "players" ? (
                  <PlayersPanel teamId={selectedTeam.id} canWrite={canWrite} />
                ) : (
                  <GamesPanel
                    teamId={selectedTeam.id}
                    canWrite={canWrite}
                    onOpenGame={onOpenGame}
                  />
                )}
              </>
            )}
          </section>
        </div>

        {teamModalOpen && (
          <TeamFormModal
            initialName={editingTeam?.name ?? ""}
            onClose={() => {
              setTeamModalOpen(false);
              setEditingTeam(null);
            }}
            onSave={handleSaveTeam}
          />
        )}
      </div>
    </div>
  );
}

function TeamFormModal({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  return (
    <Modal title={initialName ? "Modifier l'équipe" : "Nouvelle équipe"} onClose={onClose}>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void onSave(name.trim());
        }}
      >
        <label>
          Nom de l'équipe
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <button type="submit" className="header-btn auth-submit">Enregistrer</button>
      </form>
    </Modal>
  );
}

function PlayersPanel({ teamId, canWrite }: { teamId: string; canWrite: boolean }) {
  const [players, setPlayers] = useState<PlayerApiRead[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerApiRead | null>(null);

  async function reload(currentSearch?: string) {
    setPlayers(await fetchTeamPlayersDetailed(teamId, currentSearch));
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    const timeout = setTimeout(() => void reload(search), 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, teamId]);

  async function handleDelete(player: PlayerApiRead) {
    if (!confirm(`Supprimer ${player.first_name} ${player.last_name} ?`)) return;
    await deletePlayer(player.id);
    await reload(search);
  }

  return (
    <div>
      <div className="management-toolbar">
        <input
          placeholder="Rechercher un joueur..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canWrite && (
          <button
            className="header-btn"
            onClick={() => {
              setEditingPlayer(null);
              setModalOpen(true);
            }}
          >
            + Joueur
          </button>
        )}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Poste</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>{player.jersey_number}</td>
              <td>
                {player.first_name} {player.last_name}
              </td>
              <td>{player.position}</td>
              {canWrite && (
                <td>
                  <span className="management-item-actions">
                    <button
                      onClick={() => {
                        setEditingPlayer(player);
                        setModalOpen(true);
                      }}
                    >
                      Modifier
                    </button>
                    <button onClick={() => void handleDelete(player)}>Supprimer</button>
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {modalOpen && (
        <PlayerFormModal
          teamId={teamId}
          player={editingPlayer}
          onClose={() => {
            setModalOpen(false);
            setEditingPlayer(null);
          }}
          onSaved={async () => {
            setModalOpen(false);
            setEditingPlayer(null);
            await reload(search);
          }}
        />
      )}
    </div>
  );
}

function PlayerFormModal({
  teamId,
  player,
  onClose,
  onSaved,
}: {
  teamId: string;
  player: PlayerApiRead | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [firstName, setFirstName] = useState(player?.first_name ?? "");
  const [lastName, setLastName] = useState(player?.last_name ?? "");
  const [jerseyNumber, setJerseyNumber] = useState(String(player?.jersey_number ?? ""));
  const [position, setPosition] = useState(player?.position ?? "PG");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      jersey_number: Number(jerseyNumber),
      position,
      height_cm: null,
      weight_kg: null,
    };
    if (player) {
      await updatePlayer(player.id, input);
    } else {
      await createPlayer(teamId, input);
    }
    await onSaved();
  }

  return (
    <Modal title={player ? "Modifier le joueur" : "Nouveau joueur"} onClose={onClose}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Prénom
          <input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            required
          />
        </label>
        <label>
          Nom
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        </label>
        <label>
          Numéro de maillot
          <input
            type="number"
            value={jerseyNumber}
            onChange={(event) => setJerseyNumber(event.target.value)}
            required
          />
        </label>
        <label>
          Poste
          <select value={position} onChange={(event) => setPosition(event.target.value)}>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="header-btn auth-submit">Enregistrer</button>
      </form>
    </Modal>
  );
}

function GamesPanel({
  teamId,
  canWrite,
  onOpenGame,
}: {
  teamId: string;
  canWrite: boolean;
  onOpenGame: (gameId: string) => void;
}) {
  const [games, setGames] = useState<GameApiRead[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function reload() {
    setGames(await fetchTeamGames(teamId));
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const filtered = games.filter((game) =>
    game.opponent_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="management-toolbar">
        <input
          placeholder="Rechercher un adversaire..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canWrite && (
          <button className="header-btn" onClick={() => setModalOpen(true)}>
            + Match
          </button>
        )}
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Adversaire</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((game) => (
            <tr key={game.id}>
              <td>{new Date(game.game_date).toLocaleDateString("fr-FR")}</td>
              <td>
                {game.label ? `${game.label} — ` : ""}
                {game.opponent_name}
              </td>
              <td>{game.status}</td>
              <td>
                <button className="header-btn" onClick={() => onOpenGame(game.id)}>
                  Ouvrir la saisie
                </button>
                <CopySpectatorLinkButton game={game} />
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={4} className="management-empty">
                Aucun match
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {modalOpen && (
        <GameFormModal
          teamId={teamId}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await reload();
          }}
        />
      )}
    </div>
  );
}

function CopySpectatorLinkButton({ game }: { game: GameApiRead }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}${window.location.pathname}?live=${game.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context): nothing else to fall back to here.
    }
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => void handleCopy()}
      title="Copier le lien spectateur"
      aria-label="Copier le lien spectateur"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      )}
    </button>
  );
}

function GameFormModal({
  teamId,
  onClose,
  onSaved,
}: {
  teamId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [opponentName, setOpponentName] = useState("");
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [label, setLabel] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await createGame(teamId, opponentName.trim(), new Date(gameDate).toISOString(), label.trim());
    await onSaved();
  }

  return (
    <Modal title="Nouveau match" onClose={onClose}>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Adversaire
          <input
            value={opponentName}
            onChange={(event) => setOpponentName(event.target.value)}
            required
          />
        </label>
        <label>
          Date
          <input
            type="datetime-local"
            value={gameDate}
            onChange={(event) => setGameDate(event.target.value)}
            required
          />
        </label>
        <label>
          Libellé (optionnel)
          <input value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <button type="submit" className="header-btn auth-submit">Créer le match</button>
      </form>
    </Modal>
  );
}
