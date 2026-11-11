// The study plan's scheduler (PLAN.md 9.1). Pure: everything it needs is
// passed in, including `today`, so it can be tested with a fake clock.
//
// Model, in brief:
// - Only the chosen study days get work. Each has a budget of `capMin` minutes.
// - Review comes first on every study day. Today it costs the due cards × the per-card estimate,
//   plus any review minutes already logged today. Future days keep `futureReviewMin` for it
//   (see futureReviewMinutes in estimates.ts).
// - Tasks finished today stay on today's list (ticked) and count against today's budget, so
//   finishing early shows "done for today" instead of pulling more work in.
// - The open tasks are then placed in order while they fit. A task is never split. A task too
//   big for any normal day (over cap minus the review allowance) goes alone on a day that has
//   nothing placed yet. Otherwise the cap is never exceeded.
// - Nothing is kept from earlier days: the schedule is recomputed from what is left, so missed
//   work simply rolls forward.

import { addDays, weekday, type Day } from '../days.ts';
import { reviewCardMinutes, taskMinutes, type Estimates } from './estimates.ts';
import type { PlanTask } from './tasks.ts';

export type PlanItem = { task: PlanTask; minutes: number; done: boolean };
export type ReviewItem = { cards: number; minutes: number; done: boolean };

export type DayPlan = {
  day: Day;
  study: boolean;
  /** Review, first item of every study day (null on rest days). */
  review: ReviewItem | null;
  items: PlanItem[];
  /** Review + task minutes. */
  minutes: number;
};

export type ScheduleInput = {
  /** Every task in study order. */
  tasks: PlanTask[];
  /** Finished task id → the day it was finished. */
  done: Map<string, Day>;
  today: Day;
  /** 0 = Sunday … 6 = Saturday. */
  studyDays: number[];
  capMin: number;
  estimates: Estimates;
  /** Cards due in today's review session. */
  reviewDue: number;
  /** Review minutes already logged today. */
  reviewDoneTodayMin: number;
  /** Minutes kept for review on each future study day. */
  futureReviewMin: number;
  /** Safety limit on how far ahead to schedule. */
  maxDays?: number;
};

export type Schedule = {
  /** Today first (study day or not), then every future study day that has work. */
  days: DayPlan[];
  /** Day the last task is scheduled (or was finished), null if it cannot be scheduled. */
  finish: Day | null;
  /** Tasks not finished yet. */
  open: number;
  /** The first open task not on today's list (for "Do the next task"). */
  next: PlanTask | null;
};

export const isStudyDay = (day: Day, studyDays: number[]) => studyDays.includes(weekday(day));

/** The first study day after `day` (null if no day of the week is a study day). */
export function nextStudyDay(day: Day, studyDays: number[]): Day | null {
  if (studyDays.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const d = addDays(day, i);
    if (isStudyDay(d, studyDays)) return d;
  }
  return null;
}

export function buildSchedule(input: ScheduleInput): Schedule {
  const { tasks, done, today, studyDays, capMin, estimates } = input;
  const maxDays = input.maxDays ?? 3660;
  const minutesOf = (t: PlanTask) => taskMinutes(t, estimates);
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  const byOrder = (a: PlanItem, b: PlanItem) => (order.get(a.task.id) ?? 0) - (order.get(b.task.id) ?? 0);

  const open = tasks.filter((t) => !done.has(t.id));
  let cursor = 0;
  const normalBudget = Math.max(0, capMin - input.futureReviewMin);

  /** Places open tasks on a day with `budget` minutes left; `placed` tasks are already on it. */
  const fill = (items: PlanItem[], budget: number, placed: number): number => {
    let left = budget;
    while (cursor < open.length && left > 0) {
      const task = open[cursor];
      const m = minutesOf(task);
      const oversize = placed === 0 && m > normalBudget;
      if (m > left && !oversize) break;
      items.push({ task, minutes: m, done: false });
      left -= m;
      placed++;
      cursor++;
      if (oversize) break;
    }
    return budget - left;
  };

  const days: DayPlan[] = [];
  let lastScheduled: Day | null = null;

  // Today.
  const todayStudy = isStudyDay(today, studyDays);
  const doneToday: PlanItem[] = tasks.filter((t) => done.get(t.id) === today).map((task) => ({ task, minutes: minutesOf(task), done: true }));
  const todayItems = [...doneToday];
  let review: ReviewItem | null = null;
  let todayMinutes = doneToday.reduce((s, i) => s + i.minutes, 0);
  if (todayStudy) {
    const reviewMin = reviewCardMinutes(input.reviewDue, estimates) + Math.round(input.reviewDoneTodayMin);
    review = { cards: input.reviewDue, minutes: reviewMin, done: input.reviewDue === 0 };
    todayMinutes += reviewMin;
    if (capMin > 0) todayMinutes += fill(todayItems, capMin - todayMinutes, doneToday.length);
    if (cursor > 0) lastScheduled = today;
  }
  todayItems.sort(byOrder);
  days.push({ day: today, study: todayStudy, review, items: todayItems, minutes: todayMinutes });
  const next = open[cursor] ?? null;

  // Future study days.
  if (studyDays.length > 0 && capMin > 0) {
    let day = today;
    for (let i = 0; i < maxDays && cursor < open.length; i++) {
      day = addDays(day, 1);
      if (!isStudyDay(day, studyDays)) continue;
      const items: PlanItem[] = [];
      const used = fill(items, normalBudget, 0);
      days.push({ day, study: true, review: { cards: 0, minutes: input.futureReviewMin, done: false }, items, minutes: input.futureReviewMin + used });
      lastScheduled = day;
    }
  }

  let finish: Day | null = null;
  if (open.length === 0) {
    for (const d of done.values()) if (!finish || d > finish) finish = d;
  } else if (cursor >= open.length) {
    finish = lastScheduled;
  }

  return { days, finish, open: open.length, next };
}

export type NextUp = { kind: 'review'; cards: number } | { kind: 'task'; task: PlanTask } | null;

export type DaySummary = {
  /** Items on the day's list, review included. */
  total: number;
  done: number;
  /** Estimated minutes of what is still open (for review, the cards still due). */
  leftMin: number;
  /** The first open item on the list, or after it the next task in the plan. */
  next: NextUp;
  /** Every item on the list is done. */
  finished: boolean;
};

/** Counts for "Today · 2 of 5 done · ~18 min left". `later` is the next open task after today's list. */
export function daySummary(d: DayPlan, estimates: Estimates, later: PlanTask | null): DaySummary {
  let total = d.items.length;
  let done = d.items.filter((i) => i.done).length;
  let leftMin = d.items.filter((i) => !i.done).reduce((s, i) => s + i.minutes, 0);
  let next: NextUp = null;
  if (d.review) {
    total++;
    if (d.review.done) done++;
    else {
      leftMin += reviewCardMinutes(d.review.cards, estimates);
      next = { kind: 'review', cards: d.review.cards };
    }
  }
  const open = d.items.find((i) => !i.done);
  next ??= open ? { kind: 'task', task: open.task } : later ? { kind: 'task', task: later } : null;
  return { total, done, leftMin, next, finished: done === total };
}
