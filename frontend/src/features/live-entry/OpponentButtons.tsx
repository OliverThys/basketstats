import { ActionType } from "../../domain/actionTypes";

interface OpponentButtonsProps {
  onScore: (action: ActionType) => void;
}

export function OpponentButtons({ onScore }: OpponentButtonsProps) {
  return (
    <div className="opponent-buttons">
      <h4>Opponent Scores</h4>
      <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FT_MADE)}>
        Free Throw
      </button>
      <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG2_MADE)}>
        2 Points
      </button>
      <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG3_MADE)}>
        3 Points
      </button>
      <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FOUL)}>
        Foul
      </button>
    </div>
  );
}
