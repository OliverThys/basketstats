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

function FieldGoalGroup({
  title,
  madeAction,
  missAction,
  selectedAction,
  onSelect,
}: {
  title: string;
  madeAction: ActionType;
  missAction: ActionType;
  selectedAction: ActionType | null;
  onSelect: (action: ActionType) => void;
}) {
  return (
    <div className="action-group fg-group">
      <h4>{title}</h4>
      <div className="action-grid-2">
        <ActionButton action={madeAction} label="Réussi" variant="made" selected={selectedAction === madeAction} onSelect={onSelect} />
        <ActionButton action={missAction} label="Manqué" variant="missed" selected={selectedAction === missAction} onSelect={onSelect} />
      </div>
    </div>
  );
}

export function ActionButtons({ selectedAction, onSelect }: ActionButtonsProps) {
  return (
    <div className="action-buttons">
      <div className="fg-groups">
        <FieldGoalGroup
          title="2 Points"
          madeAction={ActionType.FG2_MADE}
          missAction={ActionType.FG2_MISS}
          selectedAction={selectedAction}
          onSelect={onSelect}
        />
        <FieldGoalGroup
          title="3 Points"
          madeAction={ActionType.FG3_MADE}
          missAction={ActionType.FG3_MISS}
          selectedAction={selectedAction}
          onSelect={onSelect}
        />
        <FieldGoalGroup
          title="Lancers francs"
          madeAction={ActionType.FT_MADE}
          missAction={ActionType.FT_MISS}
          selectedAction={selectedAction}
          onSelect={onSelect}
        />
      </div>

      <div className="stat-groups">
        <div className="action-group">
          <h4>Rebonds</h4>
          <div className="action-grid-2">
            <ActionButton action={ActionType.REB_OFF} label="Offensif" variant="neutral" selected={selectedAction === ActionType.REB_OFF} onSelect={onSelect} />
            <ActionButton action={ActionType.REB_DEF} label="Défensif" variant="neutral" selected={selectedAction === ActionType.REB_DEF} onSelect={onSelect} />
          </div>
        </div>

        <div className="action-group">
          <h4>Autres stats</h4>
          <div className="action-grid-2">
            <ActionButton action={ActionType.BLOCK} label="Contre" variant="neutral" selected={selectedAction === ActionType.BLOCK} onSelect={onSelect} />
            <ActionButton action={ActionType.ASSIST} label="Passe" variant="neutral" selected={selectedAction === ActionType.ASSIST} onSelect={onSelect} />
            <ActionButton action={ActionType.STEAL} label="Interception" variant="neutral" selected={selectedAction === ActionType.STEAL} onSelect={onSelect} />
            <ActionButton action={ActionType.TURNOVER} label="Balle Perdue" variant="neutral" selected={selectedAction === ActionType.TURNOVER} onSelect={onSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}
