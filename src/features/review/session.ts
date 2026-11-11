// One review session (PLAN.md 5.3), pure so the rules are tested:
// - the list of cards is fixed when the session starts;
// - the first answer to a card grades it (the caller saves that at once);
// - a card answered "Again" comes back once at the end, and that second
//   answer does not change its schedule again.

import { addDays, fromDay, type Day } from '../../lib/days.ts';
import { dueToday, type ReviewCards } from '../../lib/review.ts';

export type Session = {
  /** Card keys still to show; the first is on screen. */
  queue: string[];
  /** Card key → its first answer (true = Got it). */
  first: Record<string, boolean>;
  /** Number of answers given, repeats included. */
  answers: number;
};

export const startSession = (keys: readonly string[]): Session => ({ queue: [...new Set(keys)], first: {}, answers: 0 });

export const currentKey = (s: Session): string | null => s.queue[0] ?? null;
export const isSessionDone = (s: Session) => s.queue.length === 0;

/** Answers the card on screen. `grade` is set only for a first answer: that is the one to save. */
export function answerCard(s: Session, gotIt: boolean): { session: Session; grade: { key: string; gotIt: boolean } | null } {
  const [key, ...rest] = s.queue;
  if (key === undefined) return { session: s, grade: null };
  const isFirst = !(key in s.first);
  const queue = isFirst && !gotIt ? [...rest, key] : rest;
  const first = isFirst ? { ...s.first, [key]: gotIt } : s.first;
  return { session: { queue, first, answers: s.answers + 1 }, grade: isFirst ? { key, gotIt } : null };
}

export function sessionCounts(s: Session) {
  const results = Object.values(s.first);
  const gotFirstTime = results.filter(Boolean).length;
  const neededAgain = results.length - gotFirstTime;
  return {
    /** Cards answered at least once. */
    reviewed: results.length,
    gotFirstTime,
    neededAgain,
    left: s.queue.length,
    /** Share of the session done, 0-1 (the repeats of "Again" cards count as work too). */
    progress: s.answers + s.queue.length === 0 ? 1 : s.answers / (s.answers + s.queue.length),
  };
}

/**
 * When the next review is after `today`, and how many cards it will have (with today's limits).
 * Null when no card will ever come up (for example no cards at all).
 */
export function nextReview(cards: ReviewCards, today: Day, opts: { newCardsPerDay: number; sessionCap: number }): { day: Day; count: number } | null {
  const tomorrow = addDays(today, 1);
  const days = [...new Set(Object.values(cards).map((c) => (c.due > today ? c.due : tomorrow)))].sort();
  for (const day of days) {
    const count = dueToday(cards, day, opts).length;
    if (count > 0) return { day, count };
  }
  return null;
}

/** "today", "tomorrow", or a short date such as "Fri 20 Nov". */
export function describeDay(day: Day, today: Day): string {
  if (day <= today) return 'today';
  if (day === addDays(today, 1)) return 'tomorrow';
  return fromDay(day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "Lesson 11" etc. resolved from a card's lesson key ("2/L11"). */
export function splitLessonKey(key: string): { level: number; id: string } | null {
  const [level, id] = key.split('/');
  const n = Number(level);
  return id && Number.isInteger(n) ? { level: n, id } : null;
}
