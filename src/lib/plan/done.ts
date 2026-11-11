// Which plan tasks are finished, and when. App tasks tick themselves from the
// lesson progress; book reading is ticked by hand (see bookStore.ts).

import type { LessonProgress } from '../progress.ts';
import { toDay, type Day } from '../days.ts';
import type { PlanTask } from './tasks.ts';

/** A ticked book task: when, and how many minutes I said it took. */
export type BookTick = { at: string; minutes: number };
export type BookTicks = Record<string, BookTick>;

const latest = (times: (string | undefined)[]): string | undefined => {
  let best: string | undefined;
  for (const t of times) if (t && (!best || t > best)) best = t;
  return best;
};

/** When the task was finished (ISO time), or undefined while it is still open. */
export function taskDoneAt(task: PlanTask, progress: LessonProgress | undefined, book: BookTicks): string | undefined {
  if (task.kind === 'book') return book[task.id]?.at;
  if (!progress) return undefined;
  switch (task.kind) {
    case 'words': {
      const ids = task.wordIds ?? [];
      const got = ids.map((id) => progress.vocabGot[id]);
      if (ids.length > 0 && got.every(Boolean)) return latest(got);
      return task.part ? progress.vocabParts[String(task.part) as '1' | '2'] : undefined;
    }
    case 'grammar':
      return task.ref ? progress.grammarDone[task.ref] : undefined;
    case 'dialogue':
      return task.ref ? progress.dialoguesDone[task.ref] : undefined;
    case 'exercise':
      return task.ref ? progress.exerciseSets[task.ref]?.at : undefined;
    case 'speaking':
      return progress.speakingDone;
  }
}

/** Task id → the local day it was finished, for every finished task. */
export function doneDays(
  tasks: PlanTask[],
  progressOf: (lessonKey: string) => LessonProgress | undefined,
  book: BookTicks,
): Map<string, Day> {
  const done = new Map<string, Day>();
  for (const task of tasks) {
    const at = taskDoneAt(task, progressOf(task.lesson), book);
    if (at) done.set(task.id, toDay(new Date(at)));
  }
  return done;
}
