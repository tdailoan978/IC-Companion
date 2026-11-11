// The week view (PLAN.md 9.1): Monday to Sunday with planned and finished
// work, minutes planned vs measured, and the lessons completed each day.

import type { Activity } from '../progress.ts';
import { addDays, toDay, weekStart, type Day } from '../days.ts';
import { taskMinutes, reviewMinutesOn, type Estimates } from './estimates.ts';
import { isStudyDay, type PlanItem, type Schedule } from './schedule.ts';
import type { PlanTask } from './tasks.ts';

export type WeekDay = {
  day: Day;
  when: 'past' | 'today' | 'future';
  study: boolean;
  /** Past days: what was finished. Today: today's list. Future days: what is planned. */
  items: PlanItem[];
  /** Review minutes: measured on past days, planned today and later (0 = none). */
  reviewMin: number;
  /** Estimated minutes of the day's items plus review. */
  plannedMin: number;
  /** Minutes the activity log measured that day (0 for future days). */
  measuredMin: number;
  /** Lesson keys completed that day. */
  completed: string[];
};

/** Total minutes logged per local day. */
export function measuredByDay(log: Activity[]): Map<Day, number> {
  const out = new Map<Day, number>();
  for (const a of log) {
    const d = toDay(new Date(a.at));
    out.set(d, (out.get(d) ?? 0) + a.ms / 60_000);
  }
  return out;
}

export function buildWeek(args: {
  /** Any day of the week to show. */
  anyDay: Day;
  today: Day;
  schedule: Schedule;
  tasks: PlanTask[];
  done: Map<string, Day>;
  log: Activity[];
  estimates: Estimates;
  studyDays: number[];
  /** Lesson key → day completed. */
  completions: Map<string, Day>;
}): WeekDay[] {
  const { today, schedule, tasks, done, log, estimates, studyDays, completions } = args;
  const start = weekStart(args.anyDay);
  const planned = new Map(schedule.days.map((d) => [d.day, d]));
  const measured = measuredByDay(log);

  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    const when = day < today ? 'past' : day === today ? 'today' : 'future';
    const completed = [...completions].filter(([, d]) => d === day).map(([key]) => key);
    const study = isStudyDay(day, studyDays);
    let items: PlanItem[];
    let reviewMin: number;
    if (when === 'past') {
      items = tasks.filter((t) => done.get(t.id) === day).map((task) => ({ task, minutes: taskMinutes(task, estimates), done: true }));
      reviewMin = Math.round(reviewMinutesOn(log, day));
    } else {
      const plan = planned.get(day);
      items = plan?.items ?? [];
      reviewMin = plan?.review?.minutes ?? 0;
    }
    const plannedMin = reviewMin + items.reduce((s, it) => s + it.minutes, 0);
    const measuredMin = when === 'future' ? 0 : Math.round(measured.get(day) ?? 0);
    return { day, when, study, items, reviewMin, plannedMin, measuredMin, completed };
  });
}
