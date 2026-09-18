import { ActionType } from "../../domain/actionTypes";

interface OpponentButtonsProps {
  onScore: (action: ActionType) => void;
  opponentName: string;
}

export function OpponentButtons({ onScore, opponentName }: OpponentButtonsProps) {
  return (
    <div className="opponent-buttons">
      <h4>{opponentName}</h4>
      <div className="action-row">
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FT_MADE)}>
          Marqué 1
        </button>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG2_MADE)}>
          Marqué 2
        </button>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FG3_MADE)}>
          Marqué 3
        </button>
      </div>
      <div className="action-row" style={{ marginTop: '0.25rem' }}>
        <button className="opponent-button" onClick={() => onScore(ActionType.OPP_FOUL)}>
          Faute
        </button>
      </div>
    </div>
  );
}
