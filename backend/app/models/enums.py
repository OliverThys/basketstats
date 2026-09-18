import enum


class UserRole(enum.StrEnum):
    OWNER = "owner"
    HEAD_COACH = "head_coach"
    ASSISTANT = "assistant"
    VIEWER = "viewer"


class Position(enum.StrEnum):
    PG = "PG"
    SG = "SG"
    SF = "SF"
    PF = "PF"
    C = "C"


class GameStatus(enum.StrEnum):
    SETUP = "setup"
    LIVE = "live"
    FINAL = "final"


class EventActor(enum.StrEnum):
    HOME_PLAYER = "home_player"
    OPPONENT_TEAM = "opponent_team"


class ActionType(enum.StrEnum):
    FG2_MADE = "FG2_MADE"
    FG2_MISS = "FG2_MISS"
    FG3_MADE = "FG3_MADE"
    FG3_MISS = "FG3_MISS"
    FT_MADE = "FT_MADE"
    FT_MISS = "FT_MISS"
    REB_OFF = "REB_OFF"
    REB_DEF = "REB_DEF"
    ASSIST = "ASSIST"
    STEAL = "STEAL"
    BLOCK = "BLOCK"
    TURNOVER = "TURNOVER"
    FOUL_COMMITTED = "FOUL_COMMITTED"
    FOUL_DRAWN = "FOUL_DRAWN"
    SUB_IN = "SUB_IN"
    SUB_OUT = "SUB_OUT"
    OPP_FT_MADE = "OPP_FT_MADE"
    OPP_FG2_MADE = "OPP_FG2_MADE"
    OPP_FG3_MADE = "OPP_FG3_MADE"
    OPP_FOUL = "OPP_FOUL"


SHOT_ACTION_TYPES = frozenset(
    {
        ActionType.FG2_MADE,
        ActionType.FG2_MISS,
        ActionType.FG3_MADE,
        ActionType.FG3_MISS,
    }
)
