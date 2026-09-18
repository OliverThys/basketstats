import type { SyncStatus } from "../../offline/sync";

const LABELS: Partial<Record<SyncStatus, string>> = {
  pending: "Attente de sync",
  offline: "Hors ligne",
};

/** Only surfaces when there's something to know (pending/offline) — a
 * "Synchronisé" pill sitting in the header at all times is just noise. */
export function SyncBadge({ status }: { status: SyncStatus }) {
  const label = LABELS[status];
  if (!label) return null;

  return (
    <span className={`sync-badge ${status}`} data-testid="sync-badge">
      {label}
    </span>
  );
}
