// Mirrors backend/app/models/enums.py — keep both in sync by hand until a
// codegen pipeline exists (backend is Python, frontend is TS: no shared runtime).

export const ActionType = {
  FG2_MADE: "FG2_MADE",
  FG2_MISS: "FG2_MISS",
  FG3_MADE: "FG3_MADE",
  FG3_MISS: "FG3_MISS",
  FT_MADE: "FT_MADE",
  FT_MISS: "FT_MISS",
  REB_OFF: "REB_OFF",
  REB_DEF: "REB_DEF",
  ASSIST: "ASSIST",
  STEAL: "STEAL",
  BLOCK: "BLOCK",
  TURNOVER: "TURNOVER",
  FOUL_COMMITTED: "FOUL_COMMITTED",
  FOUL_DRAWN: "FOUL_DRAWN",
  SUB_IN: "SUB_IN",
  SUB_OUT: "SUB_OUT",
  OPP_FT_MADE: "OPP_FT_MADE",
  OPP_FG2_MADE: "OPP_FG2_MADE",
  OPP_FG3_MADE: "OPP_FG3_MADE",
  OPP_FOUL: "OPP_FOUL",
} as const;

export type ActionType = (typeof ActionType)[keyof typeof ActionType];

export type EventActor = "home_player" | "opponent_team";

export const SHOT_ACTION_TYPES: ReadonlySet<ActionType> = new Set([
  ActionType.FG2_MADE,
  ActionType.FG2_MISS,
  ActionType.FG3_MADE,
  ActionType.FG3_MISS,
]);

export function isShotAction(action: ActionType): boolean {
  return SHOT_ACTION_TYPES.has(action);
}

export const ACTION_LABELS: Record<ActionType, string> = {
  FG2_MADE: "2pt Made",
  FG2_MISS: "2pt Missed",
  FG3_MADE: "3pt Made",
  FG3_MISS: "3pt Missed",
  FT_MADE: "Free Throw Made",
  FT_MISS: "Free Throw Missed",
  REB_OFF: "Offensive Rebound",
  REB_DEF: "Defensive Rebound",
  ASSIST: "Assist",
  STEAL: "Steal",
  BLOCK: "Block",
  TURNOVER: "Turnover",
  FOUL_COMMITTED: "Foul Committed",
  FOUL_DRAWN: "Foul Forced",
  SUB_IN: "Substituted In",
  SUB_OUT: "Substituted Out",
  OPP_FT_MADE: "Free Throw Made",
  OPP_FG2_MADE: "2 Points",
  OPP_FG3_MADE: "3 Points",
  OPP_FOUL: "Foul",
};
