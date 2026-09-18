import type { SyncStatus } from "../../offline/sync";

const LABELS: Record<SyncStatus, string> = {
  synced: "Synchronisé",
  pending: "Attente de sync",
  offline: "Hors ligne",
};

export function SyncBadge({ status }: { status: SyncStatus }) {
  return (
    <span className={`sync-badge ${status}`} data-testid="sync-badge">
      {LABELS[status]}
    </span>
  );
}
