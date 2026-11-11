// Time estimates for plan tasks (PLAN.md 9.1). Each kind starts from a default
// and switches to the median of my own measured times once there are at least
// three usable measurements in the activity log.

import type { Activity, ActivityKind } from '../progress.ts';
import { addDays, toDay, type Day } from '../days.ts';
import type { PlanTask, TaskKind } from './tasks.ts';

export type EstimateKind = 'book' | 'word' | 'grammar' | 'dialogue' | 'exercise' | 'speaking' | 'review';

/** Defaults in minutes per unit: per page, per word, per point, per dialogue, per set, per run, per card. */
export const DEFAULT_MIN: Record<EstimateKind, number> = {
  book: 3,
  word: 2,
  grammar: 10,
  dialogue: 15,
  exercise: 8,
  speaking: 5,
  review: 20 / 60,
};

export const ESTIMATE_LABELS: Record<EstimateKind, string> = {
  book: 'Book reading, per page',
  word: 'New word',
  grammar: 'Grammar point',
  dialogue: 'Dialogue',
  exercise: 'Exercise set',
  speaking: 'Speaking prompts',
  review: 'Review card',
};

export const ESTIMATE_KINDS = Object.keys(DEFAULT_MIN) as EstimateKind[];

/** Measurements needed before the median replaces the default. */
export const MIN_SAMPLES = 3;
/** Entries shorter than this are not real timings (e.g. several points marked in a row). */
export const MIN_MS = 5000;

export type Estimate = { minPerUnit: number; measured: boolean; samples: number };
export type Estimates = Record<EstimateKind, Estimate>;

/** Which estimate an activity feeds, and whether its time is divided by `count`. */
const SOURCE: Record<ActivityKind, { kind: EstimateKind; perCount: boolean }> = {
  'vocab-part': { kind: 'word', perCount: true },
  book: { kind: 'book', perCount: true },
  review: { kind: 'review', perCount: true },
  grammar: { kind: 'grammar', perCount: false },
  dialogue: { kind: 'dialogue', perCount: false },
  'exercise-set': { kind: 'exercise', perCount: false },
  speaking: { kind: 'speaking', perCount: false },
};

const TASK_ESTIMATE: Record<TaskKind, EstimateKind> = {
  book: 'book',
  words: 'word',
  grammar: 'grammar',
  dialogue: 'dialogue',
  exercise: 'exercise',
  speaking: 'speaking',
};

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Defaults, replaced by measured medians (first runs only, at least 5 s each). */
export function estimatesFrom(log: Activity[]): Estimates {
  const samples: Record<EstimateKind, number[]> = { book: [], word: [], grammar: [], dialogue: [], exercise: [], speaking: [], review: [] };
  for (const a of log) {
    const source = SOURCE[a.kind];
    if (!source || a.repeat || !(a.ms >= MIN_MS)) continue;
    if (source.perCount) {
      if (!a.count || a.count <= 0) continue;
      samples[source.kind].push(a.ms / a.count / 60_000);
    } else {
      samples[source.kind].push(a.ms / 60_000);
    }
  }
  const out = {} as Estimates;
  for (const kind of ESTIMATE_KINDS) {
    const list = samples[kind];
    out[kind] =
      list.length >= MIN_SAMPLES
        ? { minPerUnit: median(list), measured: true, samples: list.length }
        : { minPerUnit: DEFAULT_MIN[kind], measured: false, samples: list.length };
  }
  return out;
}

/** Whole minutes for one task (at least 1). */
export const taskMinutes = (task: PlanTask, est: Estimates): number =>
  Math.max(1, Math.round(task.units * est[TASK_ESTIMATE[task.kind]].minPerUnit));

/** Whole minutes for reviewing this many cards (0 for none). */
export const reviewCardMinutes = (cards: number, est: Estimates): number => (cards > 0 ? Math.max(1, Math.round(cards * est.review.minPerUnit)) : 0);

/** Minutes of review logged on one day (every session, repeats included: it is time actually spent). */
export function reviewMinutesOn(log: Activity[], day: Day): number {
  let ms = 0;
  for (const a of log) if (a.kind === 'review' && toDay(new Date(a.at)) === day) ms += a.ms;
  return ms / 60_000;
}

/** Default review allowance for a future day before any review has been measured. */
export const DEFAULT_FUTURE_REVIEW_MIN = 5;

/**
 * Minutes kept for review on future study days (their due cards are not known yet): the median
 * of the daily review minutes measured on the 7 days before today (days with any review), else
 * 5 minutes; rounded up, and never more than half the daily cap.
 */
export function futureReviewMinutes(log: Activity[], today: Day, capMin: number): number {
  const daily: number[] = [];
  for (let i = 1; i <= 7; i++) {
    const m = reviewMinutesOn(log, addDays(today, -i));
    if (m > 0) daily.push(m);
  }
  const minutes = daily.length ? Math.ceil(median(daily)) : DEFAULT_FUTURE_REVIEW_MIN;
  return Math.min(minutes, Math.floor(capMin / 2));
}
