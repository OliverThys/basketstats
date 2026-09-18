const tails = new Map<string, Promise<unknown>>();

/** Serializes writes that allocate `seq` for a game so two rapid taps cannot
 * mint the same sequence number (tab still alive) or interleave Dexie adds. */
export async function withRecordLock<T>(gameId: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(gameId) ?? Promise.resolve();
  const next = previous.then(task, task);
  tails.set(
    gameId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}
