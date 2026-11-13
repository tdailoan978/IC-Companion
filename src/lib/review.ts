// Spaced repetition for vocabulary (PLAN.md 5.3): Leitner boxes 1-5 with
// intervals 1, 2, 4, 8, 16 days. "Got it" moves a card up a box, "Again"
// sends it back to box 1. One record in IndexedDB holds every card.
// Pure functions take `today` so they can be tested with a fake clock.

import { useSyncExternalStore } from 'react';
import { addDays, type Day } from './days.ts';
import { readStrict, setSaveFailed, write } from './storage.ts';

export const INTERVALS = [1, 2, 4, 8, 16] as const;
export type Box = 1 | 2 | 3 | 4 | 5;

export type ReviewCard = {
  /** The vocab item id, e.g. L11.v.12 (unique within a level). */
  id: string;
  /** Lesson key, e.g. "2/L11" (see lessonKey in content/types.ts). */
  lesson: string;
  box: Box;
  /** Next review day. */
  due: Day;
  /** Day the card joined the review queue. */
  added: Day;
  /** Day of its first review; undefined while it is still "new". */
  firstReviewed?: Day;
  lastReviewed?: Day;
};

export type ReviewCards = Record<string, ReviewCard>;
/** Card key: vocab ids are unique per level, so the lesson key is part of it. */
export const cardKey = (lesson: string, vocabId: string) => `${lesson.split('/')[0]}/${vocabId}`;

/** New cards: first review the day after they were learned. Existing cards are left alone. */
export function addCards(cards: ReviewCards, lesson: string, vocabIds: string[], learnedOn: Day): ReviewCards {
  const next = { ...cards };
  for (const id of vocabIds) {
    const key = cardKey(lesson, id);
    if (!next[key]) next[key] = { id, lesson, box: 1, due: addDays(learnedOn, INTERVALS[0]), added: learnedOn };
  }
  return next;
}

export function gradeCard(card: ReviewCard, gotIt: boolean, today: Day): ReviewCard {
  const box = (gotIt ? Math.min(card.box + 1, 5) : 1) as Box;
  return { ...card, box, due: addDays(today, INTERVALS[box - 1]), firstReviewed: card.firstReviewed ?? today, lastReviewed: today };
}

/**
 * Today's session: due cards that were reviewed before, oldest due first, then
 * new cards (oldest added first) up to what is left of today's new-card
 * allowance; at most `sessionCap` in all.
 */
export function dueToday(
  cards: ReviewCards,
  today: Day,
  opts: { newCardsPerDay: number; sessionCap: number; playable?: (c: ReviewCard) => boolean },
): ReviewCard[] {
  // Cards that can't be shown (an own word that was deleted or can't be read) never take a slot.
  const all = Object.values(cards).filter((c) => c.due <= today && (!opts.playable || opts.playable(c)));
  const byDue = (a: ReviewCard, b: ReviewCard) => a.due.localeCompare(b.due) || a.added.localeCompare(b.added) || a.id.localeCompare(b.id);
  const seen = all.filter((c) => c.firstReviewed).sort(byDue);
  const introducedToday = Object.values(cards).filter((c) => c.firstReviewed === today && c.added !== today).length;
  const newAllowance = Math.max(0, opts.newCardsPerDay - introducedToday);
  const fresh = all.filter((c) => !c.firstReviewed).sort(byDue).slice(0, newAllowance);
  return [...seen, ...fresh].slice(0, Math.max(0, opts.sessionCap));
}

// ---- store ----

const KEY = 'review.cards';
let cache: ReviewCards | null = null;
let loading: Promise<ReviewCards> | null = null;
const listeners = new Set<() => void>();
const EMPTY: ReviewCards = {};
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function loadReviewCards(): Promise<ReviewCards> {
  if (cache) return Promise.resolve(cache);
  loading ??= readStrict<ReviewCards>(KEY, {}).then(
    (saved) => {
      cache = saved;
      notify();
      return saved;
    },
    (err) => {
      loading = null;
      throw err;
    },
  );
  return loading;
}

/** Applies a change to all cards and saves it; true if saved. Skips the write if the saved cards could not be read. */
export async function updateReviewCards(change: (cards: ReviewCards) => ReviewCards): Promise<boolean> {
  let cards: ReviewCards;
  try {
    cards = await loadReviewCards();
  } catch (err) {
    console.warn('Could not load review cards', err);
    setSaveFailed(true);
    return false;
  }
  // Two updates can wait on the same load; each must build on the other's result.
  cache = change(cache ?? cards);
  notify();
  return write(KEY, cache);
}

export function useReviewCards(): { cards: ReviewCards; loaded: boolean } {
  const cards = useSyncExternalStore(subscribe, () => cache ?? EMPTY);
  if (!cache) loadReviewCards().catch((err) => console.warn('Could not load review cards', err));
  return { cards, loaded: cache !== null };
}

/** Forgets the in-memory copy (after Import or Reset) so the next use reads storage again. */
export function resetReviewCache(): void {
  cache = null;
  loading = null;
  notify();
}
