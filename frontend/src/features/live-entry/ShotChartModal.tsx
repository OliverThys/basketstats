import { ActionType } from "../../domain/actionTypes";
import type { LocalGameEvent } from "../../offline/db";
import { Modal } from "./Modal";
import { ShotPad, type ShotMarker } from "./ShotPad";

const MADE_ACTIONS = new Set<string>([ActionType.FG2_MADE, ActionType.FG3_MADE]);
const SHOT_ACTIONS = new Set<string>([
  ActionType.FG2_MADE,
  ActionType.FG2_MISS,
  ActionType.FG3_MADE,
  ActionType.FG3_MISS,
]);

interface ShotChartModalProps {
  events: LocalGameEvent[];
  onClose: () => void;
}

/** Read-only view of every shot recorded so far. Filtering by player/quarter
 * and export land in Phase 3, which is dedicated to the shot chart. */
export function ShotChartModal({ events, onClose }: ShotChartModalProps) {
  const markers: ShotMarker[] = events
    .filter((event) => !event.voided && SHOT_ACTIONS.has(event.actionType) && event.x !== null && event.y !== null)
    .map((event) => ({
      id: event.id,
      x: event.x!,
      y: event.y!,
      made: MADE_ACTIONS.has(event.actionType),
    }));

  return (
    <Modal title="Shot Chart" onClose={onClose}>
      <ShotPad markers={markers} interactive={false} />
    </Modal>
  );
}
