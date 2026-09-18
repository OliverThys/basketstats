import { ActionType } from "../../domain/actionTypes";

interface ActionButtonsProps {
  selectedAction: ActionType | null;
  onSelect: (action: ActionType) => void;
}

function ActionButton({
  action,
  label,
  variant,
  selected,
  onSelect,
}: {
  action: ActionType;
  label: string;
  variant: "made" | "missed" | "neutral";
  selected: boolean;
  onSelect: (action: ActionType) => void;
}) {
  return (
    <button
      className={["action-button", variant, selected ? "selected" : ""].join(" ").trim()}
      onClick={() => onSelect(action)}
    >
      {label}
    </button>
  );
}

export function ActionButtons({ selectedAction, onSelect }: ActionButtonsProps) {
  return (
    <div className="action-buttons">
      <div className="action-group">
        <h4>Points</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FT_MADE} label="+1" variant="made" selected={selectedAction === ActionType.FT_MADE} onSelect={onSelect} />
          <ActionButton action={ActionType.FG2_MADE} label="+2" variant="made" selected={selectedAction === ActionType.FG2_MADE} onSelect={onSelect} />
          <ActionButton action={ActionType.FG3_MADE} label="+3" variant="made" selected={selectedAction === ActionType.FG3_MADE} onSelect={onSelect} />
        </div>
        <div className="action-row" style={{ marginTop: '0.25rem' }}>
          <ActionButton action={ActionType.FT_MISS} label="Manqué 1" variant="missed" selected={selectedAction === ActionType.FT_MISS} onSelect={onSelect} />
          <ActionButton action={ActionType.FG2_MISS} label="Manqué 2" variant="missed" selected={selectedAction === ActionType.FG2_MISS} onSelect={onSelect} />
          <ActionButton action={ActionType.FG3_MISS} label="Manqué 3" variant="missed" selected={selectedAction === ActionType.FG3_MISS} onSelect={onSelect} />
        </div>
      </div>
      
      <div className="action-group">
        <h4>Rebonds</h4>
        <div className="action-row">
          <ActionButton action={ActionType.REB_OFF} label="Off." variant="neutral" selected={selectedAction === ActionType.REB_OFF} onSelect={onSelect} />
          <ActionButton action={ActionType.REB_DEF} label="Déf." variant="neutral" selected={selectedAction === ActionType.REB_DEF} onSelect={onSelect} />
        </div>
      </div>
      
      <div className="action-group">
        <h4>Fautes</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FOUL_COMMITTED} label="Faute" variant="neutral" selected={selectedAction === ActionType.FOUL_COMMITTED} onSelect={onSelect} />
          <ActionButton action={ActionType.FOUL_DRAWN} label="Provoquée" variant="neutral" selected={selectedAction === ActionType.FOUL_DRAWN} onSelect={onSelect} />
        </div>
      </div>
      
      <div className="action-group">
        <h4>Autres</h4>
        <div className="action-row">
          <ActionButton action={ActionType.TURNOVER} label="Balle Perdue" variant="neutral" selected={selectedAction === ActionType.TURNOVER} onSelect={onSelect} />
          <ActionButton action={ActionType.STEAL} label="Interception" variant="neutral" selected={selectedAction === ActionType.STEAL} onSelect={onSelect} />
          <ActionButton action={ActionType.ASSIST} label="Passe" variant="neutral" selected={selectedAction === ActionType.ASSIST} onSelect={onSelect} />
          <ActionButton action={ActionType.BLOCK} label="Contre" variant="neutral" selected={selectedAction === ActionType.BLOCK} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
