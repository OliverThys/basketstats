import { liveQuery } from "dexie";
import { useEffect, useState } from "react";

/** Thin wrapper around Dexie's liveQuery so components re-render whenever the
 * underlying IndexedDB tables change, without adding the dexie-react-hooks
 * dependency for a single hook. */
export function useLiveQuery<T>(querier: () => Promise<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    const subscription = liveQuery(querier).subscribe({
      next: setValue,
      error: (error) => console.error("useLiveQuery error", error),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
