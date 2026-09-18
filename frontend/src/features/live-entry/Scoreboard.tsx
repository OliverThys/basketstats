import { computeBoxScore } from "../../domain/boxScore";
import { ActionType } from "../../domain/actionTypes";
import type { LocalGameEvent } from "../../offline/db";

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
  const teamFouls = periodEvents.filter(
    (event) => event.actor === "home_player" && event.actionType === ActionType.FOUL_COMMITTED,
  ).length;
  const inBonus = teamFouls >= 5;

  return (
    <section className="scoreboard">
      <div className="scoreboard-names">
        <span>{homeTeamName}</span>
        <span>{opponentName}</span>
      </div>
      <div className="scoreboard-score">
        <span>{overall.homeScore}</span>
        <span className="scoreboard-sep">:</span>
        <span>{overall.opponentScore}</span>
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
        <span className="step-label">{stepLabel}</span>
        <span className={inBonus ? "team-fouls bonus" : "team-fouls"}>
          Team fouls: {teamFouls}
          {inBonus ? " (Bonus)" : ""}
        </span>
        <span className="quarter-score">
          Quarter score: {periodScore.homeScore}:{periodScore.opponentScore}
        </span>
      </div>
    </section>
  );
}
