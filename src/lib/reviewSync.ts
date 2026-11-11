// Brings the review queue in line with lesson progress: every vocabulary part
// whose flashcards were finished should have its words in review (PLAN.md 5.2
// step 2). The flashcards add cards when a part is finished; this catches parts
// finished before the review system existed, or whose card write was lost.

import type { Lesson } from './content/types.ts';
import { lessonKey } from './content/types.ts';
import { allLessons } from './content/lessons.ts';
import { toDay, type Day } from './days.ts';
import { getProgress, loadProgress, type LessonProgress } from './progress.ts';
import { addCards, cardKey, loadReviewCards, updateReviewCards, type ReviewCards } from './review.ts';

export type MissingCards = { lesson: string; ids: string[]; learnedOn: Day };

/** Words of finished vocabulary parts that have no review card yet, one entry per part. Pure. */
export function missingReviewCards(lesson: Lesson, progress: LessonProgress, cards: ReviewCards): MissingCards[] {
  const key = lessonKey(lesson);
  const out: MissingCards[] = [];
  for (const part of ['1', '2'] as const) {
    const finishedAt = progress.vocabParts[part];
    if (!finishedAt) continue;
    const finished = new Date(finishedAt);
    if (Number.isNaN(finished.getTime())) continue;
    const ids = lesson.vocab.filter((v) => String(v.part) === part && !cards[cardKey(key, v.id)]).map((v) => v.id);
    if (ids.length > 0) out.push({ lesson: key, ids, learnedOn: toDay(finished) });
  }
  return out;
}

/** Applies a list of missing cards. Pure. */
export const addMissingCards = (cards: ReviewCards, missing: MissingCards[]): ReviewCards =>
  missing.reduce((acc, m) => addCards(acc, m.lesson, m.ids, m.learnedOn), cards);

/** Adds cards for every finished part that lacks them, in one write (none if nothing is missing). */
export async function syncReviewFromProgress(): Promise<void> {
  const loaded = await Promise.allSettled(allLessons.map((l) => loadProgress(l)));
  const lessons = allLessons.filter((_, i) => loaded[i].status === 'fulfilled');
  const findMissing = (cards: ReviewCards) =>
    lessons.flatMap((l) => {
      const p = getProgress(l);
      return p ? missingReviewCards(l, p, cards) : [];
    });
  if (findMissing(await loadReviewCards()).length === 0) return;
  await updateReviewCards((cards) => addMissingCards(cards, findMissing(cards)));
}

let synced: Promise<void> | null = null;

/** Runs syncReviewFromProgress once per app start (later calls share the first run). */
export function ensureReviewSynced(): Promise<void> {
  synced ??= syncReviewFromProgress().catch((err) => {
    console.warn('Could not sync review cards', err);
    synced = null;
  });
  return synced;
}
