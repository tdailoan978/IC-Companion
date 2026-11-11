// Plan state on the device: book-reading ticks (key `plan.book`, part of
// Export/Import with everything else) and a re-readable copy of the activity
// log for the time estimates.

import { useEffect, useSyncExternalStore } from 'react';
import type { Lesson } from '../content/types.ts';
import { loadActivityLog, logActivity, type Activity } from '../progress.ts';
import { readStrict, setSaveFailed, write } from '../storage.ts';
import type { BookTicks } from './done.ts';
import type { PlanTask } from './tasks.ts';

export const BOOK_KEY = 'plan.book';

// ---- book ticks ----

let book: BookTicks | null = null;
let bookLoading: Promise<BookTicks> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const EMPTY: BookTicks = {};

export function loadBookTicks(): Promise<BookTicks> {
  if (book) return Promise.resolve(book);
  bookLoading ??= readStrict<BookTicks>(BOOK_KEY, {}).then(
    (saved) => {
      book = saved;
      notify();
      return saved;
    },
    (err) => {
      bookLoading = null;
      throw err;
    },
  );
  return bookLoading;
}

async function changeBook(change: (b: BookTicks) => BookTicks): Promise<void> {
  let current: BookTicks;
  try {
    current = await loadBookTicks();
  } catch (err) {
    console.warn('Could not load book ticks', err);
    setSaveFailed(true);
    return;
  }
  // Two changes can wait on the same load; each must build on the other's result.
  book = change(book ?? current);
  notify();
  await write(BOOK_KEY, book);
}

/** Ticks a book-reading task and logs how long it took (minutes per page feed the estimate). */
export async function tickBook(task: PlanTask, minutes: number, lesson: Pick<Lesson, 'level' | 'id'>): Promise<void> {
  await changeBook((b) => ({ ...b, [task.id]: { at: new Date().toISOString(), minutes } }));
  await logActivity(lesson, 'book', task.id, minutes * 60_000, task.units);
  bumpActivity();
}

/** Unticks a book task (its logged time stays in the activity log). */
export const untickBook = (taskId: string) =>
  changeBook((b) => {
    const next = { ...b };
    delete next[taskId];
    return next;
  });

export function useBookTicks(): { ticks: BookTicks; loaded: boolean } {
  const ticks = useSyncExternalStore(subscribe, () => book ?? EMPTY);
  if (!book) loadBookTicks().catch((err) => console.warn('Could not load book ticks', err));
  return { ticks, loaded: book !== null };
}

/** Forgets the in-memory ticks (after Import or Reset) so the next use reads storage again. */
export function resetPlanCache(): void {
  book = null;
  bookLoading = null;
  log = null;
  notify();
}

// ---- activity log (read-only here; screens append with logActivity) ----

let log: Activity[] | null = null;
const EMPTY_LOG: Activity[] = [];

/** Re-reads the activity log (after something was logged). */
export function bumpActivity(): void {
  loadActivityLog().then(
    (entries) => {
      log = entries;
      notify();
    },
    (err) => console.warn('Could not read the activity log', err),
  );
}

/** The activity log, re-read each time a screen using it opens and when the app returns to the foreground. */
export function useActivityLog(): { log: Activity[]; loaded: boolean } {
  const current = useSyncExternalStore(subscribe, () => log ?? EMPTY_LOG);
  useEffect(() => {
    bumpActivity();
    const onVisible = () => {
      if (document.visibilityState === 'visible') bumpActivity();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return { log: current, loaded: log !== null };
}
