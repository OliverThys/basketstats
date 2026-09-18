import { ActionType } from "../../domain/actionTypes";

interface OpponentButtonsProps {
  onScore: (action: ActionType) => void;
  opponentName: string;
}

export function OpponentButtons({ onScore, opponentName }: OpponentButtonsProps) {
  return (
    <div className="action-group opponent-scores">
      <h4>Score adversaire — {opponentName}</h4>
      <div className="action-column">
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FT_MADE)}>
          Lancer franc
        </button>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG2_MADE)}>
          2 Points
        </button>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG3_MADE)}>
          3 Points
        </button>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FOUL)}>
          Faute
        </button>
      </div>
    </div>
  );
}
