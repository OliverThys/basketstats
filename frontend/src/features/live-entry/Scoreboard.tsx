import { computeBoxScore } from "../../domain/boxScore";
import { ActionType } from "../../domain/actionTypes";
import type { LocalGameEvent } from "../../offline/db";
import { FoulDots } from "./FoulDots";
import { LedNumber } from "./LedDigits";

const PERIODS = [1, 2, 3, 4, 5] as const;
const PERIOD_LABELS: Record<number, string> = { 1: "Q1", 2: "Q2", 3: "Q3", 4: "Q4", 5: "OT" };

interface ScoreboardProps {
  homeTeamName: string;
  opponentName: string;
  events: LocalGameEvent[];
  period: number;
  onSelectPeriod: (period: number) => void;
  stepLabel: string;
}

export function Scoreboard({
  homeTeamName,
  opponentName,
  events,
  period,
  onSelectPeriod,
  stepLabel,
}: ScoreboardProps) {
  const activeEvents = events.filter((event) => !event.voided);
  const overall = computeBoxScore(activeEvents);

  const periodEvents = activeEvents.filter((event) => event.period === period);
  const periodScore = computeBoxScore(periodEvents);
  const homeFouls = periodEvents.filter(
    (event) => event.actor === "home_player" && event.actionType === ActionType.FOUL_COMMITTED,
  ).length;
  const opponentFouls = periodEvents.filter(
    (event) => event.actor === "opponent_team" && event.actionType === ActionType.OPP_FOUL,
  ).length;
  const homeInBonus = homeFouls >= 5;
  const opponentInBonus = opponentFouls >= 5;

  return (
    <section className="scoreboard">
      <div className="scoreboard-score">
        <FoulDots count={homeFouls} className={homeInBonus ? "bonus" : ""} />
        <div className="marquee">
          <div className="marquee-names">
            <span className="team-name">{homeTeamName}</span>
            <span className="team-name">{opponentName}</span>
          </div>
          <div className="led-panel">
            <LedNumber value={overall.homeScore} />
            <span className="led-sep" />
            <LedNumber value={overall.opponentScore} />
          </div>
        </div>
        <FoulDots count={opponentFouls} className={opponentInBonus ? "bonus" : ""} />
      </div>
      <div className="scoreboard-periods">
        {PERIODS.map((p) => (
          <button
            key={p}
            className={p === period ? "period-tab active" : "period-tab"}
            onClick={() => onSelectPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="scoreboard-step">
        {stepLabel && <span className="step-label">{stepLabel}</span>}
        <span className="quarter-score">
          Score du quart-temps: {periodScore.homeScore} - {periodScore.opponentScore}
        </span>
      </div>
    </section>
  );
}
