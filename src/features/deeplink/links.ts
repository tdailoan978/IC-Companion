// Deep links from the study plan (docs/NOTES_AND_DEEP_LINKS.md section 1): where each plan
// task opens, how a word-slice link maps back to its words, and what the "Back to Today" bar
// offers next. Pure, so it is tested without the screens.

import type { Lesson } from '../../lib/content/types.ts';
import { withDeepLink } from '../../lib/deeplink.ts';
import { notePath } from '../../lib/notes.ts';
import type { DayPlan } from '../../lib/plan/schedule.ts';
import { lessonTasks, type PlanTask } from '../../lib/plan/tasks.ts';
import { lessonPath } from '../lesson/steps.ts';

/** The `?item=` key of a word slice: `p1.s2` is Part 1, slice 2. */
export const sliceKey = (part: number, slice: number) => `p${part}.s${slice}`;

export function parseSliceKey(item: string | undefined): { part: 1 | 2; slice: number } | null {
  const m = item ? /^p([12])\.s([1-9]\d*)$/.exec(item) : null;
  return m ? { part: Number(m[1]) as 1 | 2, slice: Number(m[2]) } : null;
}

/** Where a plan task opens: exactly its item, marked as opened from the plan. */
export function taskLink(task: PlanTask): string {
  const from = { fromPlan: true, task: task.id };
  switch (task.kind) {
    case 'book':
      return withDeepLink(notePath({ level: task.level, lessonId: task.lessonId, kind: 'book', ref: task.section ?? '' }), from);
    case 'words': {
      const path = lessonPath(task.level, task.lessonId, 'vocab');
      return task.part && task.slice ? withDeepLink(path, { ...from, item: sliceKey(task.part, task.slice) }) : withDeepLink(path, from);
    }
    case 'grammar':
    case 'dialogue':
    case 'exercise':
      return withDeepLink(lessonPath(task.level, task.lessonId, task.step), { ...from, item: task.ref });
    case 'speaking':
      return withDeepLink(lessonPath(task.level, task.lessonId, 'speaking'), from);
  }
}

/** A vocab id such as `L11.v.12` (the note page's "Go to item" link for a word note). */
export const isVocabId = (item: string | undefined): item is string => Boolean(item && /^L\d+\.v\.\d+$/.test(item));

/** Which form a vocabulary step `?item=` takes: a plan word slice (`p1.s2`), one word (`L11.v.12`), or neither. */
export function vocabItemKind(item: string | undefined): 'slice' | 'word' | null {
  if (parseSliceKey(item)) return 'slice';
  if (isVocabId(item)) return 'word';
  return null;
}

/** The lesson's word for a `?item=L11.v.12` link, or null (not a vocab id, or not in this lesson). */
export function resolveWord(lesson: Lesson, item: string | undefined): Lesson['vocab'][number] | null {
  if (!isVocabId(item)) return null;
  return lesson.vocab.find((v) => v.id === item) ?? null;
}

export type WordSlice = {
  key: string;
  part: 1 | 2;
  slice: number;
  /** The slice's vocab ids, in book order. */
  wordIds: string[];
  /** "Part 1, words 1–7". */
  label: string;
};

/** The words of a `?item=p1.s2` link, re-derived from the plan's slicing of the lesson. Null if it is not a slice. */
export function resolveSlice(lesson: Lesson, item: string | undefined): WordSlice | null {
  const parsed = parseSliceKey(item);
  if (!parsed) return null;
  const task = lessonTasks(lesson).find((t) => t.kind === 'words' && t.part === parsed.part && t.slice === parsed.slice);
  if (!task?.wordIds?.length) return null;
  const range = /(\d+)–(\d+)$/.exec(task.label);
  return {
    key: sliceKey(parsed.part, parsed.slice),
    part: parsed.part,
    slice: parsed.slice,
    wordIds: task.wordIds,
    label: range ? `Part ${parsed.part}, words ${range[1]}–${range[2]}` : `Part ${parsed.part}, slice ${parsed.slice}`,
  };
}

/** Whether every vocab id has a "Got it" (a slice is then done; all of a part's words, the part). */
export const allGot = (ids: readonly string[], vocabGot: Record<string, string>) => ids.length > 0 && ids.every((id) => Boolean(vocabGot[id]));

export type NextUp = { kind: 'task'; task: PlanTask } | { kind: 'review'; cards: number } | null;

/**
 * What the return bar offers after `currentId` is done: the next open task on today's list
 * (the first one after the current task in plan order, else the first earlier one), then
 * today's review if cards are still due. Null when today's list is finished.
 */
export function nextForBar(day: DayPlan, currentId: string | undefined, orderOf: (taskId: string) => number): NextUp {
  const open = day.items.filter((i) => !i.done && i.task.id !== currentId).map((i) => i.task);
  const here = currentId ? orderOf(currentId) : -1;
  const after = open.find((t) => orderOf(t.id) > here);
  const task = after ?? open[0];
  if (task) return { kind: 'task', task };
  if (day.review && !day.review.done) return { kind: 'review', cards: day.review.cards };
  return null;
}

/** Link for whatever the bar offers next. */
export const nextLink = (next: NonNullable<NextUp>) => (next.kind === 'review' ? '/review' : taskLink(next.task));
