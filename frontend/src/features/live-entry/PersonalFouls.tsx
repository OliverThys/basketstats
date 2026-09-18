import { ActionType } from "../../domain/actionTypes";

interface PersonalFoulsProps {
  selectedAction: ActionType | null;
  onSelect: (action: ActionType) => void;
}

export function PersonalFouls({ selectedAction, onSelect }: PersonalFoulsProps) {
  return (
    <div className="action-group personal-fouls">
      <h4>Fautes personnelles</h4>
      <div className="action-grid-2">
        <button
          className={["action-button", "neutral", selectedAction === ActionType.FOUL_COMMITTED ? "selected" : ""].join(" ").trim()}
          onClick={() => onSelect(ActionType.FOUL_COMMITTED)}
        >
          Commise
        </button>
        <button
          className={["action-button", "neutral", selectedAction === ActionType.FOUL_DRAWN ? "selected" : ""].join(" ").trim()}
          onClick={() => onSelect(ActionType.FOUL_DRAWN)}
        >
          Provoquée
        </button>
      </div>
    </div>
  );
}
