import { computeBoxScore, PlayerBoxScore, type GameEventRecord } from "./boxScore";

export interface RosterEntry {
  playerId: string;
  isStarter: boolean;
  dnp: boolean;
}

export interface SeasonGameInput {
  opponentName: string;
  events: GameEventRecord[];
  roster: RosterEntry[];
}

export interface CountingTotals {
  gamesPlayed: number;
  fg2m: number;
  fg2a: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  rebOff: number;
  rebDef: number;
  ast: number;
  stl: number;
  tov: number;
  blk: number;
  pf: number;
  fpf: number;
  pts: number;
  plusMinus: number;
  minutesS: number;
}

export function emptyTotals(): CountingTotals {
  return {
    gamesPlayed: 0,
    fg2m: 0,
    fg2a: 0,
    fg3m: 0,
    fg3a: 0,
    ftm: 0,
    fta: 0,
    rebOff: 0,
    rebDef: 0,
    ast: 0,
    stl: 0,
    tov: 0,
    blk: 0,
    pf: 0,
    fpf: 0,
    pts: 0,
    plusMinus: 0,
    minutesS: 0,
  };
}

function addGame(totals: CountingTotals, row: PlayerBoxScore): void {
  totals.gamesPlayed += 1;
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
  totals.pts += row.pts;
  totals.plusMinus += row.plusMinus;
  totals.minutesS += row.minutesS;
}

export function average(totals: CountingTotals, key: keyof CountingTotals): number {
  return totals.gamesPlayed ? Number(totals[key]) / totals.gamesPlayed : 0;
}

export function efgPct(totals: CountingTotals): number {
  const fga = totals.fg2a + totals.fg3a;
  return fga ? (totals.fg2m + totals.fg3m + 0.5 * totals.fg3m) / fga : 0;
}

export function tsPct(totals: CountingTotals): number {
  const fga = totals.fg2a + totals.fg3a;
  const denom = 2 * (fga + 0.44 * totals.fta);
  return denom ? totals.pts / denom : 0;
}

export interface PlayerSeasonStats {
  playerId: string;
  totals: CountingTotals;
  byOpponent: Record<string, CountingTotals>;
}

export interface SeasonReport {
  players: Record<string, PlayerSeasonStats>;
  games: number;
}

/** DNP games are not counted in a player's gamesPlayed or per-game averages. */
export function computeSeasonStats(games: SeasonGameInput[]): SeasonReport {
  const report: SeasonReport = { players: {}, games: games.length };
  for (const game of games) {
    const starters = game.roster.filter((entry) => entry.isStarter && !entry.dnp).map((entry) => entry.playerId);
    const box = computeBoxScore(game.events, starters);
    for (const entry of game.roster) {
      if (entry.dnp) continue;
      const stats = (report.players[entry.playerId] ??= {
        playerId: entry.playerId,
        totals: emptyTotals(),
        byOpponent: {},
      });
      const used = box.players.get(entry.playerId) ?? new PlayerBoxScore(entry.playerId);
      addGame(stats.totals, used);
      const opp = (stats.byOpponent[game.opponentName] ??= emptyTotals());
      addGame(opp, used);
    }
  }
  return report;
}
