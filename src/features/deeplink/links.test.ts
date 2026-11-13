import { describe, expect, it } from 'vitest';
import { findLesson } from '../../lib/content/lessons.ts';
import { parseDeepLink } from '../../lib/deeplink.ts';
import type { DayPlan, PlanItem } from '../../lib/plan/schedule.ts';
import { lessonTasks, type PlanTask } from '../../lib/plan/tasks.ts';
import { allGot, isVocabId, nextForBar, nextLink, parseSliceKey, resolveSlice, resolveWord, sliceKey, taskLink, vocabItemKind } from './links.ts';

const lesson = findLesson(2, 'L11')!;
const tasks = lessonTasks(lesson);
const first = (kind: PlanTask['kind']) => tasks.find((t) => t.kind === kind)!;

/** Splits "/path?query" and parses the query the way the screens do. */
const open = (link: string) => {
  const [path, query = ''] = link.split('?');
  return { path, ...parseDeepLink(query) };
};

describe('taskLink', () => {
  it('opens a word slice as a flashcard run of that slice', () => {
    const t = first('words');
    expect(open(taskLink(t))).toEqual({ path: '/lesson/2/L11/vocab', item: 'p1.s1', fromPlan: true, task: t.id });
  });

  it('opens a grammar point, dialogue and exercise set by id', () => {
    for (const kind of ['grammar', 'dialogue', 'exercise'] as const) {
      const t = first(kind);
      const step = { grammar: 'grammar', dialogue: 'dialogues', exercise: 'exercises' }[kind];
      expect(open(taskLink(t))).toEqual({ path: `/lesson/2/L11/${step}`, item: t.ref, fromPlan: true, task: t.id });
    }
  });

  it('opens speaking without an item (the step resumes its saved card)', () => {
    const t = first('speaking');
    expect(open(taskLink(t))).toEqual({ path: '/lesson/2/L11/speaking', fromPlan: true, task: t.id });
  });

  it('opens a book task on its note page', () => {
    const t = first('book');
    const link = open(taskLink(t));
    expect(link.path).toBe(`/note/2/L11/book/${encodeURIComponent(t.section!)}`);
    expect(link).toMatchObject({ fromPlan: true, task: t.id });
    expect(link.item).toBeUndefined();
  });

  it('keeps the task id intact through the query string', () => {
    const t = tasks.find((x) => x.kind === 'book' && x.section?.includes(' '))!;
    expect(open(taskLink(t)).task).toBe(t.id);
  });
});

describe('word slices', () => {
  it('parses only well-formed slice keys', () => {
    expect(parseSliceKey('p1.s1')).toEqual({ part: 1, slice: 1 });
    expect(parseSliceKey('p2.s12')).toEqual({ part: 2, slice: 12 });
    for (const bad of [undefined, '', 'p3.s1', 'p1.s0', 'p1', 'L11.g.1', 'p1.s1x']) expect(parseSliceKey(bad)).toBeNull();
    expect(sliceKey(2, 3)).toBe('p2.s3');
  });

  it('resolves every slice of the lesson to exactly its plan task words', () => {
    for (const t of tasks.filter((x) => x.kind === 'words')) {
      const s = resolveSlice(lesson, sliceKey(t.part!, t.slice!));
      expect(s?.wordIds).toEqual(t.wordIds);
      expect(s?.part).toBe(t.part);
    }
  });

  it('labels the slice with its word numbers', () => {
    const t = first('words');
    const s = resolveSlice(lesson, 'p1.s1')!;
    expect(s.label).toBe(`Part 1, words 1–${t.wordIds!.length}`);
  });

  it('returns null for a slice that does not exist', () => {
    expect(resolveSlice(lesson, 'p1.s99')).toBeNull();
    expect(resolveSlice(lesson, 'L11.g.1')).toBeNull();
    expect(resolveSlice(lesson, undefined)).toBeNull();
  });

  it('a slice is done once every word has a Got it', () => {
    expect(allGot(['a', 'b'], { a: 't', b: 't' })).toBe(true);
    expect(allGot(['a', 'b'], { a: 't' })).toBe(false);
    expect(allGot([], {})).toBe(false);
  });
});

describe('vocabulary item forms', () => {
  it('tells a slice key from a single vocab id', () => {
    expect(vocabItemKind('p1.s1')).toBe('slice');
    expect(vocabItemKind('p2.s3')).toBe('slice');
    expect(vocabItemKind('L11.v.12')).toBe('word');
    expect(vocabItemKind('L9.v.1')).toBe('word');
    for (const other of [undefined, '', 'L11.g.3', 'L11.d1', 'L11.v.', 'L11.v.12x', 'v.12', 'p3.s1']) expect(vocabItemKind(other)).toBeNull();
    expect(isVocabId('p1.s1')).toBe(false);
  });

  it('resolves a vocab id to that word of the lesson only', () => {
    const word = lesson.vocab.find((v) => v.part === 2)!;
    expect(resolveWord(lesson, word.id)).toBe(word);
    expect(resolveWord(lesson, 'L11.v.999')).toBeNull();
    expect(resolveWord(lesson, 'L12.v.1')).toBeNull();
    expect(resolveWord(lesson, 'p1.s1')).toBeNull();
    // A vocab id is never read as a slice, and a slice key never as a word.
    expect(resolveSlice(lesson, word.id)).toBeNull();
  });
});

describe('nextForBar', () => {
  const [a, b, c, d] = tasks;
  const order = new Map(tasks.map((t, i) => [t.id, i]));
  const orderOf = (id: string) => order.get(id) ?? -1;
  const item = (task: PlanTask, done = false): PlanItem => ({ task, minutes: 5, done });
  const day = (items: PlanItem[], review: DayPlan['review'] = { cards: 0, minutes: 0, done: true }): DayPlan => ({
    day: '2026-11-13',
    study: true,
    review,
    items,
    minutes: 0,
  });

  it('offers the next open task after the current one', () => {
    expect(nextForBar(day([item(a, true), item(b), item(c)]), a.id, orderOf)).toEqual({ kind: 'task', task: b });
    expect(nextForBar(day([item(a), item(b, true), item(c), item(d)]), b.id, orderOf)).toEqual({ kind: 'task', task: c });
  });

  it('wraps to an earlier open task when nothing after is open', () => {
    expect(nextForBar(day([item(a), item(b), item(c, true)]), c.id, orderOf)).toEqual({ kind: 'task', task: a });
  });

  it('never offers the current task, even before its tick arrives', () => {
    expect(nextForBar(day([item(a), item(b)]), a.id, orderOf)).toEqual({ kind: 'task', task: b });
  });

  it('works for a task that is not on today’s list', () => {
    expect(nextForBar(day([item(a), item(b, true)]), d.id, orderOf)).toEqual({ kind: 'task', task: a });
  });

  it('offers due review once the tasks are done, then nothing', () => {
    expect(nextForBar(day([item(a, true)], { cards: 4, minutes: 2, done: false }), a.id, orderOf)).toEqual({ kind: 'review', cards: 4 });
    expect(nextForBar(day([item(a, true), item(b, true)]), a.id, orderOf)).toBeNull();
    expect(nextForBar(day([], null), a.id, orderOf)).toBeNull();
  });

  it('links to the next task with its own deep link, or to review', () => {
    expect(nextLink({ kind: 'review', cards: 3 })).toBe('/review');
    expect(nextLink({ kind: 'task', task: b })).toBe(taskLink(b));
  });
});
