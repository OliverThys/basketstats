// Mirrors backend/tests/fixtures/reference_game.py exactly. Both suites derive
// the same known box score (see docs/reference-app/) from the same raw
// event counts, so backend and frontend can never silently diverge.

import { ActionType } from "./actionTypes";
import type { GameEventRecord } from "./boxScore";

export interface PlayerFixture {
  playerId: string;
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
  expectedPts: number;
  expectedEff: number;
}

export const REFERENCE_GAME_PLAYERS: PlayerFixture[] = [
  { playerId: "korchagin", fg2m: 0, fg2a: 3, fg3m: 1, fg3a: 1, ftm: 0, fta: 0, rebOff: 1, rebDef: 1, ast: 1, stl: 0, tov: 0, blk: 0, pf: 1, fpf: 1, expectedPts: 3, expectedEff: 3 },
  { playerId: "kotishevski", fg2m: 0, fg2a: 4, fg3m: 0, fg3a: 1, ftm: 1, fta: 2, rebOff: 0, rebDef: 0, ast: 0, stl: 1, tov: 0, blk: 0, pf: 3, fpf: 0, expectedPts: 1, expectedEff: -4 },
  { playerId: "beverly", fg2m: 4, fg2a: 7, fg3m: 2, fg3a: 3, ftm: 7, fta: 10, rebOff: 3, rebDef: 8, ast: 8, stl: 5, tov: 3, blk: 0, pf: 1, fpf: 6, expectedPts: 21, expectedEff: 35 },
  { playerId: "zupan", fg2m: 5, fg2a: 6, fg3m: 0, fg3a: 1, ftm: 3, fta: 4, rebOff: 2, rebDef: 3, ast: 1, stl: 3, tov: 2, blk: 0, pf: 4, fpf: 4, expectedPts: 13, expectedEff: 17 },
  { playerId: "zozulin", fg2m: 0, fg2a: 2, fg3m: 2, fg3a: 4, ftm: 0, fta: 0, rebOff: 0, rebDef: 1, ast: 2, stl: 0, tov: 1, blk: 0, pf: 5, fpf: 3, expectedPts: 6, expectedEff: 4 },
  { playerId: "ponkrashov", fg2m: 1, fg2a: 3, fg3m: 2, fg3a: 5, ftm: 0, fta: 0, rebOff: 0, rebDef: 1, ast: 0, stl: 2, tov: 1, blk: 0, pf: 1, fpf: 0, expectedPts: 8, expectedEff: 5 },
  { playerId: "dycok", fg2m: 2, fg2a: 2, fg3m: 0, fg3a: 0, ftm: 0, fta: 0, rebOff: 1, rebDef: 2, ast: 0, stl: 2, tov: 1, blk: 0, pf: 3, fpf: 0, expectedPts: 4, expectedEff: 8 },
  { playerId: "bashminov", fg2m: 6, fg2a: 8, fg3m: 0, fg3a: 0, ftm: 3, fta: 4, rebOff: 1, rebDef: 2, ast: 0, stl: 0, tov: 0, blk: 0, pf: 3, fpf: 2, expectedPts: 15, expectedEff: 15 },
  { playerId: "kolesnikov", fg2m: 1, fg2a: 2, fg3m: 0, fg3a: 2, ftm: 0, fta: 0, rebOff: 1, rebDef: 0, ast: 2, stl: 0, tov: 1, blk: 0, pf: 0, fpf: 0, expectedPts: 2, expectedEff: 1 },
  { playerId: "domercant", fg2m: 2, fg2a: 6, fg3m: 1, fg3a: 3, ftm: 2, fta: 2, rebOff: 0, rebDef: 3, ast: 2, stl: 0, tov: 2, blk: 0, pf: 2, fpf: 4, expectedPts: 9, expectedEff: 6 },
];

export const EXPECTED_TOTALS = {
  fg2m: 21,
  fg2a: 43,
  fg3m: 8,
  fg3a: 20,
  fgm: 29,
  fga: 63,
  ftm: 16,
  fta: 22,
  rebOff: 9,
  rebDef: 21,
  rebTot: 30,
  ast: 16,
  stl: 13,
  tov: 11,
  blk: 0,
  pf: 23,
  fpf: 20,
  eff: 90,
  pts: 82,
};

export const EXPECTED_HOME_SCORE = 82;

function repeat(actionType: ActionType, playerId: string, count: number): GameEventRecord[] {
  return Array.from({ length: count }, () => ({
    actionType,
    actor: "home_player" as const,
    playerId,
  }));
}

export function buildReferenceGameEvents(): GameEventRecord[] {
  const events: GameEventRecord[] = [];
  for (const p of REFERENCE_GAME_PLAYERS) {
    events.push(...repeat(ActionType.FG2_MADE, p.playerId, p.fg2m));
    events.push(...repeat(ActionType.FG2_MISS, p.playerId, p.fg2a - p.fg2m));
    events.push(...repeat(ActionType.FG3_MADE, p.playerId, p.fg3m));
    events.push(...repeat(ActionType.FG3_MISS, p.playerId, p.fg3a - p.fg3m));
    events.push(...repeat(ActionType.FT_MADE, p.playerId, p.ftm));
    events.push(...repeat(ActionType.FT_MISS, p.playerId, p.fta - p.ftm));
    events.push(...repeat(ActionType.REB_OFF, p.playerId, p.rebOff));
    events.push(...repeat(ActionType.REB_DEF, p.playerId, p.rebDef));
    events.push(...repeat(ActionType.ASSIST, p.playerId, p.ast));
    events.push(...repeat(ActionType.STEAL, p.playerId, p.stl));
    events.push(...repeat(ActionType.TURNOVER, p.playerId, p.tov));
    events.push(...repeat(ActionType.BLOCK, p.playerId, p.blk));
    events.push(...repeat(ActionType.FOUL_COMMITTED, p.playerId, p.pf));
    events.push(...repeat(ActionType.FOUL_DRAWN, p.playerId, p.fpf));
  }
  return events;
}
