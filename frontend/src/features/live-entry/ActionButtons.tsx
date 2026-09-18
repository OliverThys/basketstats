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
        <h4>2pt Field Goals</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FG2_MADE} label="Made" variant="made" selected={selectedAction === ActionType.FG2_MADE} onSelect={onSelect} />
          <ActionButton action={ActionType.FG2_MISS} label="Missed" variant="missed" selected={selectedAction === ActionType.FG2_MISS} onSelect={onSelect} />
        </div>
      </div>
      <div className="action-group">
        <h4>3pt Field Goals</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FG3_MADE} label="Made" variant="made" selected={selectedAction === ActionType.FG3_MADE} onSelect={onSelect} />
          <ActionButton action={ActionType.FG3_MISS} label="Missed" variant="missed" selected={selectedAction === ActionType.FG3_MISS} onSelect={onSelect} />
        </div>
      </div>
      <div className="action-group">
        <h4>Free Throws</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FT_MADE} label="Made" variant="made" selected={selectedAction === ActionType.FT_MADE} onSelect={onSelect} />
          <ActionButton action={ActionType.FT_MISS} label="Missed" variant="missed" selected={selectedAction === ActionType.FT_MISS} onSelect={onSelect} />
        </div>
      </div>
      <div className="action-group">
        <h4>Rebounds</h4>
        <div className="action-row">
          <ActionButton action={ActionType.REB_OFF} label="Offensive" variant="neutral" selected={selectedAction === ActionType.REB_OFF} onSelect={onSelect} />
          <ActionButton action={ActionType.REB_DEF} label="Defensive" variant="neutral" selected={selectedAction === ActionType.REB_DEF} onSelect={onSelect} />
        </div>
      </div>
      <div className="action-group">
        <h4>Other</h4>
        <div className="action-row">
          <ActionButton action={ActionType.BLOCK} label="Block" variant="neutral" selected={selectedAction === ActionType.BLOCK} onSelect={onSelect} />
          <ActionButton action={ActionType.ASSIST} label="Assist" variant="neutral" selected={selectedAction === ActionType.ASSIST} onSelect={onSelect} />
          <ActionButton action={ActionType.STEAL} label="Steal" variant="neutral" selected={selectedAction === ActionType.STEAL} onSelect={onSelect} />
          <ActionButton action={ActionType.TURNOVER} label="Turnover" variant="neutral" selected={selectedAction === ActionType.TURNOVER} onSelect={onSelect} />
        </div>
      </div>
      <div className="action-group">
        <h4>Personal Fouls</h4>
        <div className="action-row">
          <ActionButton action={ActionType.FOUL_COMMITTED} label="Committed" variant="neutral" selected={selectedAction === ActionType.FOUL_COMMITTED} onSelect={onSelect} />
          <ActionButton action={ActionType.FOUL_DRAWN} label="Forced" variant="neutral" selected={selectedAction === ActionType.FOUL_DRAWN} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
}
