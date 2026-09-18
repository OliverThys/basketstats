// Pure derivation engine: GameEvent journal -> box score.
// Deliberately mirrors backend/app/domain/box_score.py field-for-field (same
// fixture is used in boxScore.test.ts and in the backend's pytest suite) so
// the client-side live box score and the server-derived one never diverge.

import { ActionType, type EventActor } from "./actionTypes";

export interface GameEventRecord {
  actionType: ActionType;
  actor: EventActor;
  playerId?: string | null;
  voided?: boolean;
}

function pct(made: number, attempted: number): number {
  return attempted ? made / attempted : 0;
}

export class ShootingLine {
  fg2m = 0;
  fg2a = 0;
  fg3m = 0;
  fg3a = 0;
  ftm = 0;
  fta = 0;

  get fgm(): number {
    return this.fg2m + this.fg3m;
  }

  get fga(): number {
    return this.fg2a + this.fg3a;
  }

  get pts(): number {
    return 2 * this.fg2m + 3 * this.fg3m + this.ftm;
  }

  get fgPct(): number {
    return pct(this.fgm, this.fga);
  }

  get fg2Pct(): number {
    return pct(this.fg2m, this.fg2a);
  }

  get fg3Pct(): number {
    return pct(this.fg3m, this.fg3a);
  }

  get ftPct(): number {
    return pct(this.ftm, this.fta);
  }
}

type MutableCountField = "rebOff" | "rebDef" | "ast" | "stl" | "tov" | "blk" | "pf" | "fpf";

export class PlayerBoxScore extends ShootingLine {
  playerId: string;
  rebOff = 0;
  rebDef = 0;
  ast = 0;
  stl = 0;
  tov = 0;
  blk = 0;
  pf = 0;
  fpf = 0;

  constructor(playerId: string) {
    super();
    this.playerId = playerId;
  }

  get rebTot(): number {
    return this.rebOff + this.rebDef;
  }

  get eff(): number {
    return (
      this.pts +
      this.rebTot +
      this.ast +
      this.stl +
      this.blk -
      (this.fga - this.fgm) -
      (this.fta - this.ftm) -
      this.tov
    );
  }
}

export class TeamTotals extends ShootingLine {
  rebOff = 0;
  rebDef = 0;
  ast = 0;
  stl = 0;
  tov = 0;
  blk = 0;
  pf = 0;
  fpf = 0;

  get rebTot(): number {
    return this.rebOff + this.rebDef;
  }

  get eff(): number {
    return (
      this.pts +
      this.rebTot +
      this.ast +
      this.stl +
      this.blk -
      (this.fga - this.fgm) -
      (this.fta - this.ftm) -
      this.tov
    );
  }
}

export interface GameBoxScore {
  players: Map<string, PlayerBoxScore>;
  totals: TeamTotals;
  homeScore: number;
  opponentScore: number;
}

const HOME_STAT_FIELD_BY_ACTION: Partial<Record<ActionType, MutableCountField>> = {
  [ActionType.REB_OFF]: "rebOff",
  [ActionType.REB_DEF]: "rebDef",
  [ActionType.ASSIST]: "ast",
  [ActionType.STEAL]: "stl",
  [ActionType.BLOCK]: "blk",
  [ActionType.TURNOVER]: "tov",
  [ActionType.FOUL_COMMITTED]: "pf",
  [ActionType.FOUL_DRAWN]: "fpf",
};

const HOME_IGNORED_ACTIONS = new Set<ActionType>([ActionType.SUB_IN, ActionType.SUB_OUT]);

const OPPONENT_POINTS_BY_ACTION: Partial<Record<ActionType, number>> = {
  [ActionType.OPP_FT_MADE]: 1,
  [ActionType.OPP_FG2_MADE]: 2,
  [ActionType.OPP_FG3_MADE]: 3,
};

const OPPONENT_IGNORED_ACTIONS = new Set<ActionType>([ActionType.OPP_FOUL]);

export function computeBoxScore(events: Iterable<GameEventRecord>): GameBoxScore {
  const players = new Map<string, PlayerBoxScore>();
  let homeScore = 0;
  let opponentScore = 0;

  function playerRow(playerId: string): PlayerBoxScore {
    let row = players.get(playerId);
    if (!row) {
      row = new PlayerBoxScore(playerId);
      players.set(playerId, row);
    }
    return row;
  }

  for (const event of events) {
    if (event.voided) continue;

    if (event.actor === "home_player") {
      if (!event.playerId) {
        throw new Error(`home_player event ${event.actionType} is missing playerId`);
      }
      const row = playerRow(event.playerId);
      const action = event.actionType;

      if (action === ActionType.FG2_MADE) {
        row.fg2m += 1;
        row.fg2a += 1;
        homeScore += 2;
      } else if (action === ActionType.FG2_MISS) {
        row.fg2a += 1;
      } else if (action === ActionType.FG3_MADE) {
        row.fg3m += 1;
        row.fg3a += 1;
        homeScore += 3;
      } else if (action === ActionType.FG3_MISS) {
        row.fg3a += 1;
      } else if (action === ActionType.FT_MADE) {
        row.ftm += 1;
        row.fta += 1;
        homeScore += 1;
      } else if (action === ActionType.FT_MISS) {
        row.fta += 1;
      } else if (action in HOME_STAT_FIELD_BY_ACTION) {
        const field = HOME_STAT_FIELD_BY_ACTION[action]!;
        row[field] += 1;
      } else if (HOME_IGNORED_ACTIONS.has(action)) {
        // substitutions feed minutes / +- derivation in a later phase
      } else {
        throw new Error(`Unsupported home_player action_type: ${action}`);
      }
    } else if (event.actor === "opponent_team") {
      const action = event.actionType;
      if (action in OPPONENT_POINTS_BY_ACTION) {
        opponentScore += OPPONENT_POINTS_BY_ACTION[action]!;
      } else if (OPPONENT_IGNORED_ACTIONS.has(action)) {
        // team-foul-per-quarter / bonus indicator is a Phase 2 concern
      } else {
        throw new Error(`Unsupported opponent_team action_type: ${action}`);
      }
    } else {
      throw new Error(`Unknown actor: ${event.actor as string}`);
    }
  }

  const totals = new TeamTotals();
  for (const row of players.values()) {
    totals.fg2m += row.fg2m;
    totals.fg2a += row.fg2a;
    totals.fg3m += row.fg3m;
    totals.fg3a += row.fg3a;
    totals.ftm += row.ftm;
    totals.fta += row.fta;
    totals.rebOff += row.rebOff;
    totals.rebDef += row.rebDef;
    totals.ast += row.ast;
    totals.stl += row.stl;
    totals.tov += row.tov;
    totals.blk += row.blk;
    totals.pf += row.pf;
    totals.fpf += row.fpf;
  }

  return { players, totals, homeScore, opponentScore };
}
