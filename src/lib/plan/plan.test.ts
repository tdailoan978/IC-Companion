import { describe, expect, it } from 'vitest';
import { allLessons } from '../content/lessons.ts';
import { emptyProgress, type Activity, type LessonProgress } from '../progress.ts';
import { addDays } from '../days.ts';
import { bookSections, lessonTasks, planTasks, sliceSizes, type PlanTask } from './tasks.ts';
import { doneDays, taskDoneAt } from './done.ts';
import { DEFAULT_MIN, estimatesFrom, futureReviewMinutes, taskMinutes } from './estimates.ts';
import { buildSchedule, nextStudyDay, type ScheduleInput } from './schedule.ts';
import { activityDayCount, deadlineStatus } from './deadline.ts';
import { buildWeek } from './week.ts';
import { completions, lessonCompletedOn } from './milestones.ts';

const lesson = (id: string) => allLessons.find((l) => l.level === 2 && l.id === id)!;
const L11 = lesson('L11');
const L12 = lesson('L12');

const MON = '2026-11-16';
const WEEKDAYS = [1, 2, 3, 4, 5];
const DEFAULTS = estimatesFrom([]);

// ---- tasks ----

describe('task sequence', () => {
  it('slices words into near-equal slices of at most 8', () => {
    expect(sliceSizes(14)).toEqual([7, 7]);
    expect(sliceSizes(33)).toEqual([7, 7, 7, 6, 6]);
    expect(sliceSizes(15)).toEqual([8, 7]);
    expect(sliceSizes(8)).toEqual([8]);
    expect(sliceSizes(21)).toEqual([7, 7, 7]);
    expect(sliceSizes(0)).toEqual([]);
  });

  it('runs book sections to the page before the next one, the last to the end of the lesson', () => {
    expect(bookSections(L11).map((s) => `${s.section} ${s.from}-${s.to}`)).toEqual([
      'Part 1 text 2-3',
      'Part 1 vocabulary 4-5',
      'Part 1 grammar 6-11',
      'Part 1 practice 12-16',
      'Part 2 text 17-18',
      'Part 2 vocabulary 19-20',
      'Part 2 grammar 21-24',
      'Part 2 practice 25-27',
      'Cultural Literacy 28-30',
      'Lesson Wrap-Up 31-32',
    ]);
    // A section after the lesson's last page counts as one page.
    const l15 = bookSections(lesson('L15'));
    expect(l15.at(-1)).toEqual({ section: 'Keeping It Casual (L11-15)', from: 163, to: 163 });
    expect(l15.at(-2)).toEqual({ section: 'Lesson Wrap-Up', from: 161, to: 162 });
  });

  it('orders L11: book and app tasks interleaved, with stable ids', () => {
    expect(lessonTasks(L11).map((t) => t.id)).toEqual([
      '2/L11:book:Part 1 text',
      '2/L11:book:Part 1 vocabulary',
      '2/L11:words:p1:1',
      '2/L11:words:p1:2',
      '2/L11:book:Part 1 grammar',
      '2/L11:grammar:L11.g.1',
      '2/L11:grammar:L11.g.2',
      '2/L11:grammar:L11.g.3',
      '2/L11:dialogue:L11.d1',
      '2/L11:book:Part 1 practice',
      '2/L11:book:Part 2 text',
      '2/L11:book:Part 2 vocabulary',
      '2/L11:words:p2:1',
      '2/L11:words:p2:2',
      '2/L11:book:Part 2 grammar',
      '2/L11:grammar:L11.g.4',
      '2/L11:grammar:L11.g.5',
      '2/L11:grammar:L11.g.6',
      '2/L11:dialogue:L11.d2',
      '2/L11:book:Part 2 practice',
      '2/L11:book:Cultural Literacy',
      '2/L11:book:Lesson Wrap-Up',
      '2/L11:ex:L11.e1',
      '2/L11:ex:L11.e2',
      '2/L11:ex:L11.e3',
      '2/L11:ex:L11.e4',
      '2/L11:speaking',
    ]);
  });

  it('labels and sizes L11 tasks', () => {
    const t = lessonTasks(L11);
    const byId = (id: string) => t.find((x) => x.id === id)!;
    expect(byId('2/L11:book:Part 1 text')).toMatchObject({ label: 'Read Part 1 text, p. 2–3', units: 2, pages: { from: 2, to: 3 }, step: 'overview' });
    expect(byId('2/L11:words:p1:1')).toMatchObject({ units: 7, part: 1, step: 'vocab', label: 'New words: Part 1, 1–7' });
    expect(byId('2/L11:words:p1:2').wordIds).toEqual(L11.vocab.filter((v) => v.part === 1).slice(7).map((v) => v.id));
    expect(byId('2/L11:words:p2:1').units).toBe(8);
    expect(byId('2/L11:words:p2:2').units).toBe(7);
    expect(byId('2/L11:grammar:L11.g.3')).toMatchObject({ ref: 'L11.g.3', step: 'grammar' });
    expect(byId('2/L11:dialogue:L11.d1').step).toBe('dialogues');
    expect(byId('2/L11:ex:L11.e2').step).toBe('exercises');
    expect(byId('2/L11:speaking').step).toBe('speaking');
  });

  it('orders L12: 33 Part 1 words in five slices, first four of seven grammar points in Part 1', () => {
    const t = lessonTasks(L12);
    expect(t.map((x) => x.id)).toEqual([
      '2/L12:book:Part 1 text',
      '2/L12:book:Part 1 vocabulary',
      '2/L12:words:p1:1',
      '2/L12:words:p1:2',
      '2/L12:words:p1:3',
      '2/L12:words:p1:4',
      '2/L12:words:p1:5',
      '2/L12:book:Part 1 grammar',
      '2/L12:grammar:L12.g.1',
      '2/L12:grammar:L12.g.2',
      '2/L12:grammar:L12.g.3',
      '2/L12:grammar:L12.g.4',
      '2/L12:dialogue:L12.d1',
      '2/L12:book:Part 1 practice',
      '2/L12:book:Part 2 text',
      '2/L12:book:Part 2 vocabulary',
      '2/L12:words:p2:1',
      '2/L12:words:p2:2',
      '2/L12:words:p2:3',
      '2/L12:book:Part 2 grammar',
      '2/L12:grammar:L12.g.5',
      '2/L12:grammar:L12.g.6',
      '2/L12:grammar:L12.g.7',
      '2/L12:dialogue:L12.d2',
      '2/L12:book:Part 2 practice',
      '2/L12:book:Cultural Literacy',
      '2/L12:book:Lesson Wrap-Up',
      '2/L12:ex:L12.e1',
      '2/L12:ex:L12.e2',
      '2/L12:ex:L12.e3',
      '2/L12:ex:L12.e4',
      '2/L12:speaking',
    ]);
    expect(t.filter((x) => x.kind === 'words' && x.part === 1).map((x) => x.units)).toEqual([7, 7, 7, 6, 6]);
    expect(t[0].label).toBe('Read Part 1 text, p. 34–36');
    expect(t.find((x) => x.id === '2/L12:book:Lesson Wrap-Up')!.pages).toEqual({ from: 61, to: 62 });
  });

  it('covers every word of every lesson exactly once', () => {
    for (const l of allLessons) {
      const ids = lessonTasks(l).flatMap((t) => t.wordIds ?? []);
      expect(ids).toEqual(l.vocab.filter((v) => v.part === 1).concat(l.vocab.filter((v) => v.part === 2)).map((v) => v.id));
    }
    const all = planTasks(allLessons).map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
  });
});

// ---- done detection ----

describe('done detection', () => {
  const tasks = lessonTasks(L11);
  const find = (id: string) => tasks.find((t) => t.id === id)!;
  const slice = find('2/L11:words:p1:1');

  it('finishes a word slice when every word in it was got, at the latest time', () => {
    const p: LessonProgress = emptyProgress();
    slice.wordIds!.slice(0, 6).forEach((id, i) => (p.vocabGot[id] = `2026-11-16T10:0${i}:00`));
    expect(taskDoneAt(slice, p, {})).toBeUndefined();
    p.vocabGot[slice.wordIds![6]] = '2026-11-17T09:00:00';
    expect(taskDoneAt(slice, p, {})).toBe('2026-11-17T09:00:00');
  });

  it('finishes every slice of a part whose flashcards were finished', () => {
    const p = { ...emptyProgress(), vocabParts: { '1': '2026-11-16T11:00:00' } };
    expect(taskDoneAt(slice, p, {})).toBe('2026-11-16T11:00:00');
    expect(taskDoneAt(find('2/L11:words:p2:1'), p, {})).toBeUndefined();
  });

  it('reads grammar, dialogues, exercise sets, speaking and book ticks', () => {
    const p: LessonProgress = {
      ...emptyProgress(),
      grammarDone: { 'L11.g.3': '2026-11-16T10:00:00' },
      dialoguesDone: { 'L11.d1': '2026-11-16T10:30:00' },
      exerciseSets: { 'L11.e2': { score: 5, total: 6, at: '2026-11-16T11:00:00' } },
      speakingDone: '2026-11-16T12:00:00',
    };
    const book = { '2/L11:book:Part 1 text': { at: '2026-11-15T09:00:00', minutes: 10 } };
    expect(taskDoneAt(find('2/L11:grammar:L11.g.3'), p, book)).toBe('2026-11-16T10:00:00');
    expect(taskDoneAt(find('2/L11:grammar:L11.g.4'), p, book)).toBeUndefined();
    expect(taskDoneAt(find('2/L11:dialogue:L11.d1'), p, book)).toBe('2026-11-16T10:30:00');
    expect(taskDoneAt(find('2/L11:ex:L11.e2'), p, book)).toBe('2026-11-16T11:00:00');
    expect(taskDoneAt(find('2/L11:ex:L11.e1'), p, book)).toBeUndefined();
    expect(taskDoneAt(find('2/L11:speaking'), p, book)).toBe('2026-11-16T12:00:00');
    expect(taskDoneAt(find('2/L11:book:Part 1 text'), undefined, book)).toBe('2026-11-15T09:00:00');
    const days = doneDays(tasks, () => p, book);
    expect(days.get('2/L11:book:Part 1 text')).toBe('2026-11-15');
    expect(days.get('2/L11:grammar:L11.g.3')).toBe('2026-11-16');
    expect(days.size).toBe(5);
  });
});

// ---- estimates ----

const entry = (kind: Activity['kind'], ms: number, extra: Partial<Activity> = {}): Activity => ({
  at: '2026-11-16T10:00:00',
  lesson: '2/L11',
  kind,
  ref: 'x',
  ms,
  ...extra,
});

describe('estimates', () => {
  it('start from the defaults', () => {
    expect(DEFAULTS.grammar).toEqual({ minPerUnit: 10, measured: false, samples: 0 });
    expect(DEFAULTS.review.minPerUnit).toBeCloseTo(1 / 3);
    const [p1text] = lessonTasks(L11);
    expect(taskMinutes(p1text, DEFAULTS)).toBe(6); // 2 pages × 3
  });

  it('switch to the median after three usable measurements', () => {
    const two = [entry('grammar', 4 * 60_000), entry('grammar', 6 * 60_000)];
    expect(estimatesFrom(two).grammar).toMatchObject({ minPerUnit: 10, measured: false, samples: 2 });
    const three = [...two, entry('grammar', 20 * 60_000)];
    expect(estimatesFrom(three).grammar).toEqual({ minPerUnit: 6, measured: true, samples: 3 });
    const four = [...three, entry('grammar', 8 * 60_000)];
    expect(estimatesFrom(four).grammar.minPerUnit).toBe(7);
  });

  it('ignore repeats and entries under five seconds', () => {
    const log = [
      entry('dialogue', 10 * 60_000),
      entry('dialogue', 12 * 60_000),
      entry('dialogue', 2 * 60_000, { repeat: true }),
      entry('dialogue', 3000),
    ];
    expect(estimatesFrom(log).dialogue).toMatchObject({ measured: false, samples: 2 });
  });

  it('divide counted kinds by their count: words, pages, cards', () => {
    const log = [
      entry('vocab-part', 14 * 60_000, { count: 14 }),
      entry('vocab-part', 30 * 60_000, { count: 15 }),
      entry('vocab-part', 21 * 60_000, { count: 14 }),
      entry('book', 10 * 60_000, { count: 5 }),
      entry('book', 5 * 60_000, { count: 5 }),
      entry('book', 15 * 60_000, { count: 3 }),
      entry('review', 60_000, { count: 6 }),
      entry('review', 60_000, { count: 4 }),
      entry('review', 60_000, { count: 3 }),
      entry('review', 60_000), // no count: not usable per card
      entry('exercise-set', 9 * 60_000, { count: 12 }),
    ];
    const est = estimatesFrom(log);
    expect(est.word).toEqual({ minPerUnit: 1.5, measured: true, samples: 3 });
    expect(est.book).toEqual({ minPerUnit: 2, measured: true, samples: 3 });
    expect(est.review).toEqual({ minPerUnit: 0.25, measured: true, samples: 3 });
    expect(est.exercise).toMatchObject({ minPerUnit: DEFAULT_MIN.exercise, measured: false, samples: 1 });
  });

  it('keep 5 minutes for future review until reviews are measured, then the median of the last 7 days, at most half the cap', () => {
    expect(futureReviewMinutes([], MON, 30)).toBe(5);
    expect(futureReviewMinutes([], MON, 8)).toBe(4);
    const day = (d: string, min: number): Activity => entry('review', min * 60_000, { at: `${d}T08:00:00`, count: 10 });
    const log = [day(addDays(MON, -1), 4), day(addDays(MON, -2), 6), day(addDays(MON, -2), 2), day(addDays(MON, -3), 12), day(addDays(MON, -9), 30), day(MON, 30)];
    // Daily totals in the last 7 days: 4, 8, 12 → median 8 (older days and today are left out).
    expect(futureReviewMinutes(log, MON, 30)).toBe(8);
    expect(futureReviewMinutes(log, MON, 12)).toBe(6);
  });
});

// ---- scheduling ----

let n = 0;
/** A task of the given default minutes (book reading at 3 min a page, so units = minutes / 3). */
const task = (minutes: number): PlanTask => {
  n++;
  return { id: `t${n}`, lesson: '2/L11', level: 2, lessonId: 'L11', lessonNo: 11, kind: 'book', label: `Task ${n}`, units: minutes / 3, step: 'overview' };
};
const tens = (count: number) => Array.from({ length: count }, () => task(10));

const input = (over: Partial<ScheduleInput>): ScheduleInput => ({
  tasks: [],
  done: new Map(),
  today: MON,
  studyDays: WEEKDAYS,
  capMin: 30,
  estimates: DEFAULTS,
  reviewDue: 0,
  reviewDoneTodayMin: 0,
  futureReviewMin: 5,
  ...over,
});

describe('scheduling', () => {
  it('puts review first, then fills each study day up to the cap', () => {
    const tasks = tens(8);
    const s = buildSchedule(input({ tasks, reviewDue: 15 })); // 15 cards × 20 s = 5 min
    const [today, tue, wed, thu] = s.days;
    expect(today.review).toEqual({ cards: 15, minutes: 5, done: false });
    expect(today.items.map((i) => i.task.id)).toEqual([tasks[0].id, tasks[1].id]); // 5 + 20; a third would be 35
    expect(today.minutes).toBe(25);
    expect(tue.day).toBe(addDays(MON, 1));
    expect(tue.review?.minutes).toBe(5);
    expect(tue.items).toHaveLength(2);
    expect(wed.items).toHaveLength(2);
    expect(thu.items).toHaveLength(2);
    for (const d of s.days) expect(d.minutes).toBeLessThanOrEqual(30);
    expect(s.finish).toBe(addDays(MON, 3));
    expect(s.next?.id).toBe(tasks[2].id);
  });

  it('ticks review when nothing is due, and counts review already done today', () => {
    const s = buildSchedule(input({ tasks: tens(4), reviewDue: 0, reviewDoneTodayMin: 9.6 }));
    expect(s.days[0].review).toEqual({ cards: 0, minutes: 10, done: true });
    expect(s.days[0].items).toHaveLength(2);
  });

  it('places a task bigger than a day on its own on an empty day, and nothing else that day', () => {
    const big = task(36); // 12 pages
    const tasks = [task(10), big, task(10)];
    const s = buildSchedule(input({ tasks }));
    expect(s.days[0].items.map((i) => i.task.id)).toEqual([tasks[0].id]); // the big one waits for an empty day
    expect(s.days[1].items.map((i) => i.task.id)).toEqual([big.id]);
    expect(s.days[1].minutes).toBe(41);
    expect(s.days[2].items.map((i) => i.task.id)).toEqual([tasks[2].id]);
  });

  it('never splits or skips ahead: a task that does not fit waits for the next day', () => {
    const tasks = [task(10), task(15), task(1)];
    const s = buildSchedule(input({ tasks, reviewDue: 30 })); // review 10 min
    expect(s.days[0].items.map((i) => i.task.id)).toEqual([tasks[0].id]); // 10 + 10 = 20; 15 does not fit, so 1 waits too
    expect(s.days[1].items.map((i) => i.task.id)).toEqual([tasks[1].id, tasks[2].id]);
  });

  it('skips non-study days', () => {
    const fri = addDays(MON, 4);
    const s = buildSchedule(input({ tasks: tens(6), today: fri, futureReviewMin: 10 }));
    expect(s.days.map((d) => d.day)).toEqual([fri, addDays(MON, 7), addDays(MON, 8)]);
    expect(nextStudyDay(fri, WEEKDAYS)).toBe(addDays(MON, 7));
    expect(nextStudyDay(fri, [])).toBeNull();

    const sat = addDays(MON, 5);
    const rest = buildSchedule(input({ tasks: tens(3), today: sat }));
    expect(rest.days[0]).toMatchObject({ day: sat, study: false, review: null, items: [] });
    expect(rest.days[1].day).toBe(addDays(MON, 7));
  });

  it('rolls unfinished work forward after missed days, moving the finish later', () => {
    const tasks = tens(11);
    const onTime = buildSchedule(input({ tasks }));
    // Monday and Tuesday were missed; on Wednesday everything is still open.
    const wed = addDays(MON, 2);
    const late = buildSchedule(input({ tasks, today: wed }));
    expect(late.days[0].day).toBe(wed);
    expect(late.days[0].items[0].task.id).toBe(tasks[0].id);
    expect(late.finish! > onTime.finish!).toBe(true);
    expect(onTime.finish).toBe(addDays(MON, 4)); // 3 + 2 + 2 + 2 + 2
    expect(late.finish).toBe(addDays(MON, 8));
  });

  it('keeps tasks finished today on today, ticked and counted, without refilling', () => {
    const tasks = tens(6);
    const done = new Map([
      [tasks[0].id, MON],
      [tasks[1].id, MON],
      [tasks[2].id, MON],
    ]);
    const s = buildSchedule(input({ tasks, done }));
    expect(s.days[0].items.map((i) => [i.task.id, i.done])).toEqual([
      [tasks[0].id, true],
      [tasks[1].id, true],
      [tasks[2].id, true],
    ]);
    expect(s.days[0].minutes).toBe(30);
    expect(s.next?.id).toBe(tasks[3].id);
    expect(s.days[1].items[0].task.id).toBe(tasks[3].id);
    // Done on an earlier day: not on today's list at all.
    const earlier = buildSchedule(input({ tasks, done: new Map([[tasks[0].id, addDays(MON, -1)]]) }));
    expect(earlier.days[0].items.map((i) => i.task.id)).toEqual([tasks[1].id, tasks[2].id, tasks[3].id]);
  });

  it('keeps finished-today tasks in plan order when one was done out of order', () => {
    const tasks = tens(5);
    const s = buildSchedule(input({ tasks, done: new Map([[tasks[4].id, MON]]) }));
    expect(s.days[0].items.map((i) => [i.task.id, i.done])).toEqual([
      [tasks[0].id, false],
      [tasks[1].id, false],
      [tasks[4].id, true],
    ]);
  });

  it('reports the last finish day when everything is done, and no finish without study days', () => {
    const tasks = tens(2);
    const done = new Map([
      [tasks[0].id, addDays(MON, -3)],
      [tasks[1].id, addDays(MON, -1)],
    ]);
    expect(buildSchedule(input({ tasks, done }))).toMatchObject({ finish: addDays(MON, -1), open: 0, next: null });
    expect(buildSchedule(input({ tasks: tens(10), studyDays: [] })).finish).toBeNull();
  });

  it('schedules the whole of Volume 2 under the cap', () => {
    const tasks = planTasks(allLessons);
    const s = buildSchedule(input({ tasks }));
    expect(s.finish).not.toBeNull();
    const placed = s.days.flatMap((d) => d.items.map((i) => i.task.id));
    expect(placed).toEqual(tasks.map((t) => t.id));
    for (const d of s.days) {
      if (d.minutes > 30) expect(d.items).toHaveLength(1);
    }
    expect(s.days.every((d) => d.study)).toBe(true);
  });
});

// ---- deadline ----

describe('deadline', () => {
  const daysLog = (count: number): Activity[] =>
    Array.from({ length: count }, (_, i) => entry('grammar', 60_000, { at: `${addDays(MON, -i - 1)}T10:00:00` }));

  it('counts distinct activity days', () => {
    expect(activityDayCount([...daysLog(3), entry('grammar', 1, { at: `${addDays(MON, -1)}T18:00:00` })])).toBe(3);
  });

  it('proposes the projected finish after 10 activity days, unless dismissed today', () => {
    const base = { deadline: null, dismissed: null, finish: '2027-03-01', today: MON };
    expect(deadlineStatus({ ...base, activityDays: activityDayCount(daysLog(9)) })).toEqual({ kind: 'none', daysToGo: 1 });
    expect(deadlineStatus({ ...base, activityDays: activityDayCount(daysLog(10)) })).toEqual({ kind: 'propose', date: '2027-03-01' });
    expect(deadlineStatus({ ...base, activityDays: 10, dismissed: MON }).kind).toBe('none');
    expect(deadlineStatus({ ...base, activityDays: 10, dismissed: addDays(MON, -1) }).kind).toBe('propose');
  });

  it('warns when the projected finish is after the deadline', () => {
    const base = { deadline: '2027-02-01', dismissed: null, activityDays: 0, today: MON };
    expect(deadlineStatus({ ...base, finish: '2027-01-20' })).toEqual({ kind: 'on-track', deadline: '2027-02-01', finish: '2027-01-20' });
    expect(deadlineStatus({ ...base, finish: '2027-02-10' })).toEqual({ kind: 'late', deadline: '2027-02-01', finish: '2027-02-10', prompt: true });
    expect(deadlineStatus({ ...base, finish: '2027-02-10', dismissed: MON })).toMatchObject({ kind: 'late', prompt: false });
  });

  it('goes late when missed days push the finish past the deadline', () => {
    const tasks = tens(12);
    const onTime = buildSchedule(input({ tasks }));
    const deadline = onTime.finish!;
    const ok = deadlineStatus({ deadline, dismissed: null, finish: onTime.finish, activityDays: 12, today: MON });
    expect(ok.kind).toBe('on-track');
    const wed = addDays(MON, 2);
    const late = buildSchedule(input({ tasks, today: wed }));
    expect(deadlineStatus({ deadline, dismissed: null, finish: late.finish, activityDays: 12, today: wed })).toMatchObject({ kind: 'late', finish: late.finish });
  });
});

// ---- milestones and the week ----

describe('milestones and week', () => {
  const complete = (at: string): LessonProgress => ({
    ...emptyProgress(),
    steps: { overview: '2026-11-10T09:00:00', vocab: '2026-11-11T09:00:00', grammar: at, dialogues: '2026-11-12T09:00:00', exercises: '2026-11-12T10:00:00', speaking: '2026-11-12T11:00:00' },
  });

  it('dates a complete lesson by its last tick', () => {
    expect(lessonCompletedOn(complete('2026-11-17T08:00:00'))).toBe('2026-11-17');
    const partial = complete('2026-11-17T08:00:00');
    delete partial.steps.speaking;
    expect(lessonCompletedOn(partial)).toBeUndefined();
    expect(completions(['2/L11', '2/L12'], (k) => (k === '2/L11' ? complete('2026-11-17T08:00:00') : undefined))).toEqual(new Map([['2/L11', '2026-11-17']]));
  });

  it('shows finished work on past days, today’s list, and the plan for later days', () => {
    const tasks = tens(10);
    const wed = addDays(MON, 2);
    const done = new Map([
      [tasks[0].id, MON],
      [tasks[1].id, addDays(MON, 1)],
    ]);
    const log = [entry('grammar', 12 * 60_000, { at: `${MON}T10:00:00` }), entry('review', 3 * 60_000, { at: `${MON}T09:00:00`, count: 9 })];
    const schedule = buildSchedule(input({ tasks, done, today: wed }));
    const week = buildWeek({
      anyDay: wed,
      today: wed,
      schedule,
      tasks,
      done,
      log,
      estimates: DEFAULTS,
      studyDays: WEEKDAYS,
      completions: new Map([['2/L11', addDays(MON, 1)]]),
    });
    expect(week.map((d) => d.day)).toEqual(Array.from({ length: 7 }, (_, i) => addDays(MON, i)));
    expect(week[0]).toMatchObject({ when: 'past', reviewMin: 3, plannedMin: 13, measuredMin: 15, completed: [] });
    expect(week[0].items.map((i) => i.task.id)).toEqual([tasks[0].id]);
    expect(week[1].completed).toEqual(['2/L11']);
    expect(week[2]).toMatchObject({ when: 'today', plannedMin: 30 });
    expect(week[2].items.map((i) => i.task.id)).toEqual([tasks[2].id, tasks[3].id, tasks[4].id]);
    expect(week[3]).toMatchObject({ when: 'future', plannedMin: 25, measuredMin: 0 });
    expect(week[5]).toMatchObject({ study: false, items: [], plannedMin: 0 });
  });
});

describe('today summary', () => {
  it('counts review as an item, sums the open minutes and names the next thing to do', async () => {
    const { daySummary } = await import('./schedule.ts');
    const tasks = tens(6);
    const done = new Map([[tasks[0].id, MON]]);
    const s = buildSchedule(input({ tasks, done, reviewDue: 12 })); // review 4 min
    const today = daySummary(s.days[0], DEFAULTS, s.next);
    expect(today).toMatchObject({ total: 3, done: 1, leftMin: 14, finished: false, next: { kind: 'review', cards: 12 } });

    const noReview = buildSchedule(input({ tasks, done }));
    expect(daySummary(noReview.days[0], DEFAULTS, noReview.next)).toMatchObject({ total: 4, done: 2, leftMin: 20, next: { kind: 'task', task: tasks[1] } });

    const allDone = new Map(tasks.slice(0, 3).map((t) => [t.id, MON]));
    const finished = buildSchedule(input({ tasks, done: allDone }));
    expect(daySummary(finished.days[0], DEFAULTS, finished.next)).toMatchObject({ total: 4, done: 4, leftMin: 0, finished: true, next: { kind: 'task', task: tasks[3] } });
  });
});
