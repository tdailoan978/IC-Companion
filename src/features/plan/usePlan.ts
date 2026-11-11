// Gathers everything the study plan needs (settings, lesson progress, review
// cards, book ticks, the activity log) and runs the pure planner over it.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { allLessons } from '../../lib/content/lessons.ts';
import { lessonKey, type Lesson } from '../../lib/content/types.ts';
import { addDays, todayDay, type Day } from '../../lib/days.ts';
import { useLessonProgress, type LessonProgress } from '../../lib/progress.ts';
import { dueToday, useReviewCards } from '../../lib/review.ts';
import { loadSettings, useSettings, type Settings } from '../../lib/settings.ts';
import { doneDays } from '../../lib/plan/done.ts';
import { estimatesFrom, futureReviewMinutes, reviewMinutesOn, type Estimates } from '../../lib/plan/estimates.ts';
import { activityDayCount, deadlineStatus, type DeadlineStatus } from '../../lib/plan/deadline.ts';
import { completions } from '../../lib/plan/milestones.ts';
import { buildSchedule, daySummary, type DaySummary, type Schedule } from '../../lib/plan/schedule.ts';
import { useActivityLog, useBookTicks } from '../../lib/plan/store.ts';
import { planTasks, type PlanTask } from '../../lib/plan/tasks.ts';
import { buildWeek, type WeekDay } from '../../lib/plan/week.ts';

const TASKS = planTasks(allLessons);
const LESSONS = new Map(allLessons.map((l) => [lessonKey(l), l]));
export const lessonOf = (task: PlanTask): Lesson => LESSONS.get(task.lesson)!;

// ---- today, refreshed when the app comes back to the foreground or a minute passes ----

const todayListeners = new Set<() => void>();
let today = todayDay();
function refreshToday() {
  const now = todayDay();
  if (now !== today) {
    today = now;
    todayListeners.forEach((l) => l());
  }
}
function subscribeToday(l: () => void) {
  todayListeners.add(l);
  if (todayListeners.size === 1) {
    document.addEventListener('visibilitychange', refreshToday);
    timer = setInterval(refreshToday, 60_000);
  }
  return () => {
    todayListeners.delete(l);
    if (todayListeners.size === 0) {
      document.removeEventListener('visibilitychange', refreshToday);
      clearInterval(timer);
    }
  };
}
let timer: ReturnType<typeof setInterval> | undefined;
export const useToday = (): Day => useSyncExternalStore(subscribeToday, () => today);

// ---- progress of every lesson (the lesson list is fixed, so the hook order is stable) ----

function useAllProgress(): { byKey: Map<string, LessonProgress>; loaded: boolean } {
  const list = allLessons.map((l) => useLessonProgress(l));
  const loaded = list.every((p) => p.loaded);
  const deps = list.map((p) => p.progress);
  // One dependency per lesson: the memo changes when any lesson's progress does.
  const byKey = useMemo(() => new Map(allLessons.map((l, i) => [lessonKey(l), list[i].progress])), deps);
  return { byKey, loaded };
}

function useSettingsLoaded(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    loadSettings().then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  return ready;
}

export type PlanModel = {
  ready: boolean;
  settings: Settings;
  today: Day;
  tasks: PlanTask[];
  done: Map<string, Day>;
  estimates: Estimates;
  schedule: Schedule;
  summary: DaySummary;
  week: WeekDay[];
  nextWeek: WeekDay[];
  completions: Map<string, Day>;
  deadline: DeadlineStatus;
  activityDays: number;
  futureReviewMin: number;
  progressOf: (key: string) => LessonProgress | undefined;
};

export function usePlan(): PlanModel {
  const settingsReady = useSettingsLoaded();
  const settings = useSettings();
  const today = useToday();
  const { cards, loaded: cardsLoaded } = useReviewCards();
  const { ticks, loaded: bookLoaded } = useBookTicks();
  const { log, loaded: logLoaded } = useActivityLog();
  const { byKey, loaded: progressLoaded } = useAllProgress();

  return useMemo(() => {
    const progressOf = (key: string) => byKey.get(key);
    const done = doneDays(TASKS, progressOf, ticks);
    const estimates = estimatesFrom(log);
    const reviewDue = dueToday(cards, today, { newCardsPerDay: settings.newCardsPerDay, sessionCap: settings.sessionCap }).length;
    const futureReviewMin = futureReviewMinutes(log, today, settings.dailyCapMin);
    const schedule = buildSchedule({
      tasks: TASKS,
      done,
      today,
      studyDays: settings.studyDays,
      capMin: settings.dailyCapMin,
      estimates,
      reviewDue,
      reviewDoneTodayMin: reviewMinutesOn(log, today),
      futureReviewMin,
    });
    const lessonsDone = completions([...LESSONS.keys()], progressOf);
    const weekArgs = { today, schedule, tasks: TASKS, done, log, estimates, studyDays: settings.studyDays, completions: lessonsDone };
    const activityDays = activityDayCount(log);
    return {
      ready: settingsReady && cardsLoaded && bookLoaded && logLoaded && progressLoaded,
      settings,
      today,
      tasks: TASKS,
      done,
      estimates,
      schedule,
      summary: daySummary(schedule.days[0], estimates, schedule.next),
      week: buildWeek({ ...weekArgs, anyDay: today }),
      nextWeek: buildWeek({ ...weekArgs, anyDay: addDays(today, 7) }),
      completions: lessonsDone,
      deadline: deadlineStatus({
        deadline: settings.deadline,
        dismissed: settings.deadlineProposalDismissed,
        finish: schedule.finish,
        activityDays,
        today,
      }),
      activityDays,
      futureReviewMin,
      progressOf,
    };
  }, [settingsReady, settings, today, cards, cardsLoaded, ticks, bookLoaded, log, logLoaded, byKey, progressLoaded]);
}

// ---- formatting ----

const fmt = (day: Day, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-GB', opts);
};
/** "Mon 16 Nov" (with the year when it is not this year's). */
export const dayLabel = (day: Day, today?: Day) =>
  fmt(day, { weekday: 'short', day: 'numeric', month: 'short', ...(today && day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) });
/** "Monday 16 November 2026". */
export const longDayLabel = (day: Day) => fmt(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const weekdayShort = (day: Day) => fmt(day, { weekday: 'short' });

/** "Volume 2" from the lesson's book line, or "Level N". */
export const volumeName = (lesson: Lesson) => /Volume \d+/.exec(lesson.book)?.[0] ?? `Level ${lesson.level}`;
