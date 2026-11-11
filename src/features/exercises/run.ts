// A run through an exercise set: the queue of items, one answer per item, the
// score and the retry list. Pure, so the screen only renders it.

export type Run = {
  /** Item ids in the order they are asked. */
  queue: string[];
  /** Position of the current item in the queue. */
  index: number;
  /** Item id → whether it was answered correctly. One answer per item; later answers are ignored. */
  results: Record<string, boolean>;
  /** A retry of the missed items: it does not change the recorded set score. */
  retry: boolean;
};

export const startRun = (itemIds: readonly string[], retry = false): Run => ({ queue: [...itemIds], index: 0, results: {}, retry });

export const currentItem = (run: Run): string | undefined => run.queue[run.index];

/** Records the answer to an item in the queue (the first answer counts). */
export function answerItem(run: Run, itemId: string, ok: boolean): Run {
  if (!run.queue.includes(itemId) || itemId in run.results) return run;
  return { ...run, results: { ...run.results, [itemId]: ok } };
}

export const isAnswered = (run: Run, itemId: string) => itemId in run.results;

/** Moves on once the current item is answered; past the last item the run is finished. */
export function nextItem(run: Run): Run {
  const id = currentItem(run);
  if (id === undefined || !isAnswered(run, id)) return run;
  return { ...run, index: run.index + 1 };
}

export const isFinished = (run: Run) => run.queue.length > 0 && run.queue.every((id) => id in run.results) && run.index >= run.queue.length;

export const score = (run: Run) => run.queue.filter((id) => run.results[id] === true).length;

/** The missed items, in queue order: what "Retry the wrong ones" asks again. */
export const wrongIds = (run: Run) => run.queue.filter((id) => run.results[id] === false);

/** "3 of 5" for the current item. */
export const positionLabel = (run: Run) => `${Math.min(run.index + 1, run.queue.length)} of ${run.queue.length}`;

/** Ends a run whose items were all answered at once (the match board). */
export const finishRun = (run: Run): Run => (run.queue.every((id) => id in run.results) ? { ...run, index: run.queue.length } : run);
