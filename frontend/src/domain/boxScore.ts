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
  seq?: number;
  period?: number;
  gameClock?: string | null;
  x?: number | null;
  y?: number | null;
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

  get efgPct(): number {
    return this.fga ? (this.fgm + 0.5 * this.fg3m) / this.fga : 0;
  }

  get tsPct(): number {
    const denom = 2 * (this.fga + 0.44 * this.fta);
    return denom ? this.pts / denom : 0;
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
  plusMinus = 0;
  minutesS = 0;

  constructor(playerId: string) {
    super();
    this.playerId = playerId;
  }

  get rebTot(): number {
    return this.rebOff + this.rebDef;
  }

  get minutes(): number {
    return this.minutesS / 60;
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

/** Where the game clock currently stands, for a box score read mid-game.
 * Without it, playing time assumes every period in the journal was played out
 * to the buzzer — correct for a finished game, but it would credit a full 10
 * minutes to the starting five on the opening possession. */
export interface LiveClock {
  period: number;
  remainingS: number;
}

export function computeBoxScore(
  events: Iterable<GameEventRecord>,
  starterIds: Iterable<string> = [],
  liveClock?: LiveClock,
): GameBoxScore {
  const players = new Map<string, PlayerBoxScore>();
  let homeScore = 0;
  let opponentScore = 0;
  const records = [...events];

  function playerRow(playerId: string): PlayerBoxScore {
    let row = players.get(playerId);
    if (!row) {
      row = new PlayerBoxScore(playerId);
      players.set(playerId, row);
    }
    return row;
  }

  for (const event of records) {
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

  applyLineupStats(playerRow, records.filter((event) => !event.voided), starterIds, liveClock);

  return { players, totals, homeScore, opponentScore };
}

export function periodLengthS(period: number): number {
  return period <= 4 ? 600 : 300;
}

export function parseGameClock(clock: string | null | undefined): number | null {
  if (!clock) return null;
  const parts = clock.split(":");
  if (parts.length !== 2) return null;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return null;
  return minutes * 60 + seconds;
}

/** Seconds -> "MM:SS", the inverse of parseGameClock. Used both for the game
 * clock stamped onto events and for displaying derived playing time. */
export function formatClock(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function applyLineupStats(
  playerRow: (playerId: string) => PlayerBoxScore,
  events: GameEventRecord[],
  starterIds: Iterable<string>,
  liveClock?: LiveClock,
): void {
  const ordered = [...events].sort((a, b) => (a.period ?? 1) - (b.period ?? 1) || (a.seq ?? 0) - (b.seq ?? 0));
  const onCourt = new Set(starterIds);
  const checkIn = new Map<string, number | null>();
  let currentPeriod: number | null = null;
  let remaining: number | null = null;

  function closePeriod() {
    for (const playerId of onCourt) {
      const start = checkIn.get(playerId);
      if (start != null) playerRow(playerId).minutesS += Math.max(start, 0);
    }
  }

  function tickClock(newRemaining: number) {
    for (const playerId of onCourt) {
      const start = checkIn.get(playerId);
      if (start != null) playerRow(playerId).minutesS += Math.max(start - newRemaining, 0);
      checkIn.set(playerId, newRemaining);
    }
  }

  for (const event of ordered) {
    const period = event.period ?? 1;
    if (period !== currentPeriod) {
      if (currentPeriod != null) closePeriod();
      currentPeriod = period;
      remaining = periodLengthS(period);
      for (const playerId of onCourt) checkIn.set(playerId, remaining);
    }

    const clock = parseGameClock(event.gameClock);
    if (clock != null) {
      tickClock(clock);
      remaining = clock;
    }

    if (event.actor === "home_player" && event.playerId) {
      if (event.actionType === ActionType.SUB_IN) {
        onCourt.add(event.playerId);
        checkIn.set(event.playerId, remaining);
      } else if (event.actionType === ActionType.SUB_OUT) {
        const start = checkIn.get(event.playerId);
        if (start != null && remaining != null) {
          playerRow(event.playerId).minutesS += Math.max(start - remaining, 0);
        }
        checkIn.delete(event.playerId);
        onCourt.delete(event.playerId);
      }
    }

    let delta = 0;
    if (event.actor === "home_player") {
      if (event.actionType === ActionType.FG2_MADE) delta = 2;
      else if (event.actionType === ActionType.FG3_MADE) delta = 3;
      else if (event.actionType === ActionType.FT_MADE) delta = 1;
    } else if (event.actionType in OPPONENT_POINTS_BY_ACTION) {
      delta = -(OPPONENT_POINTS_BY_ACTION[event.actionType] ?? 0);
    }
    if (delta) {
      for (const playerId of onCourt) playerRow(playerId).plusMinus += delta;
    }
  }

  if (liveClock) {
    // Mid-game: the rest of the period hasn't been played yet, so stop the
    // count where the clock actually stands rather than at the buzzer.
    if (currentPeriod !== liveClock.period) {
      if (currentPeriod != null) closePeriod();
      remaining = periodLengthS(liveClock.period);
      for (const playerId of onCourt) checkIn.set(playerId, remaining);
    }
    tickClock(liveClock.remainingS);
    return;
  }

  closePeriod();
}
