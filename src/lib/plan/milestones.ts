// Lesson milestones (PLAN.md 5.2 and 9.1): a lesson is complete when every
// step is ticked; it completed on the day its last step was ticked.

import { isLessonComplete, type LessonProgress } from '../progress.ts';
import { toDay, type Day } from '../days.ts';

export function lessonCompletedOn(p: LessonProgress | undefined): Day | undefined {
  if (!p || !isLessonComplete(p)) return undefined;
  let last: string | undefined;
  for (const t of Object.values(p.steps)) if (t && (!last || t > last)) last = t;
  return last ? toDay(new Date(last)) : undefined;
}

/** Lesson key → day completed, for every complete lesson. */
export function completions(keys: string[], progressOf: (key: string) => LessonProgress | undefined): Map<string, Day> {
  const out = new Map<string, Day>();
  for (const key of keys) {
    const day = lessonCompletedOn(progressOf(key));
    if (day) out.set(key, day);
  }
  return out;
}
