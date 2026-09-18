import type { SyncStatus } from "../../offline/sync";

const LABELS: Record<SyncStatus, string> = {
  synced: "Synced",
  pending: "Sync pending",
  offline: "Offline",
};

export function SyncBadge({ status }: { status: SyncStatus }) {
  return (
    <span className={`sync-badge ${status}`} data-testid="sync-badge">
      {LABELS[status]}
    </span>
  );
}
