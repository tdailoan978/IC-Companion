// The study plan's task list (PLAN.md 9.1): every lesson becomes an ordered
// list of small tasks, with book reading interleaved with the app's own steps.
// Task ids are stable (they key the book ticks saved on the device).

import type { Lesson } from '../content/types.ts';
import { lessonKey } from '../content/types.ts';
import type { StepKey } from '../progress.ts';

export type TaskKind = 'book' | 'words' | 'grammar' | 'dialogue' | 'exercise' | 'speaking';

export type PlanTask = {
  /** Stable id, e.g. `2/L11:book:Part 1 text`, `2/L11:words:p1:1`, `2/L11:grammar:L11.g.3`. */
  id: string;
  /** Lesson key, e.g. `2/L11`. */
  lesson: string;
  level: number;
  lessonId: string;
  lessonNo: number;
  kind: TaskKind;
  /** What to do, e.g. "Read Part 1 text, p. 2–3" (may hold Chinese; render with MixedText). */
  label: string;
  /** Size for the time estimate: pages for book reading, words for a word slice, else 1. */
  units: number;
  /** The lesson step that hosts the task (book tasks open the overview). */
  step: StepKey;
  /** Book reading: section name and page range. */
  section?: string;
  pages?: { from: number; to: number };
  /** Word slice: part, slice number (1-based) and its vocab ids. */
  part?: 1 | 2;
  slice?: number;
  wordIds?: string[];
  /** Grammar point, dialogue or exercise set id. */
  ref?: string;
};

export type BookSection = { section: string; from: number; to: number };

/** Last page of a "33-62" style range (or the only page). */
export function lastPage(bookPages: string): number {
  const nums = bookPages.match(/\d+/g)?.map(Number) ?? [];
  return nums.length ? nums[nums.length - 1] : 0;
}

/**
 * Each book section runs from its page to the page before the next section; the last one ends
 * at the end of the lesson's pages. A section that starts past that end (e.g. a "Keeping It
 * Casual" review after the lesson) counts as one page.
 */
export function bookSections(lesson: Pick<Lesson, 'bookRefs' | 'bookPages'>): BookSection[] {
  const refs = [...lesson.bookRefs].sort((a, b) => a.page - b.page);
  const end = lastPage(lesson.bookPages);
  return refs.map((ref, i) => {
    const next = refs[i + 1];
    const to = next ? next.page - 1 : end;
    return { section: ref.section, from: ref.page, to: Math.max(ref.page, to) };
  });
}

/** Near-equal slices of at most `max` words, larger ones first: 14 → 7+7, 33 → 7+7+7+6+6. */
export function sliceSizes(n: number, max = 8): number[] {
  if (n <= 0) return [];
  const k = Math.ceil(n / max);
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

export const pageLabel = (from: number, to: number) => (from === to ? `p. ${from}` : `p. ${from}–${to}`);

const KNOWN_SECTIONS = ['text', 'vocabulary', 'grammar', 'practice'].flatMap((s) => [`Part 1 ${s}`, `Part 2 ${s}`]);

/** The lesson's tasks in study order (PLAN.md 9.1 "Order inside a lesson"). */
export function lessonTasks(lesson: Lesson): PlanTask[] {
  const key = lessonKey(lesson);
  const base = { lesson: key, level: lesson.level, lessonId: lesson.id, lessonNo: lesson.lesson };
  const sections = bookSections(lesson);
  const tasks: PlanTask[] = [];

  const book = (name: string) => {
    const s = sections.find((x) => x.section === name);
    if (!s) return;
    tasks.push({
      ...base,
      id: `${key}:book:${s.section}`,
      kind: 'book',
      label: `Read ${s.section}, ${pageLabel(s.from, s.to)}`,
      units: s.to - s.from + 1,
      step: 'overview',
      section: s.section,
      pages: { from: s.from, to: s.to },
    });
  };

  const words = (part: 1 | 2) => {
    const items = lesson.vocab.filter((v) => v.part === part);
    let start = 0;
    sliceSizes(items.length).forEach((size, i) => {
      const slice = items.slice(start, start + size);
      tasks.push({
        ...base,
        id: `${key}:words:p${part}:${i + 1}`,
        kind: 'words',
        label: `New words: Part ${part}, ${start + 1}–${start + size}`,
        units: size,
        step: 'vocab',
        part,
        slice: i + 1,
        wordIds: slice.map((v) => v.id),
      });
      start += size;
    });
  };

  const half = Math.ceil(lesson.grammar.length / 2);
  const grammar = (from: number, to: number) => {
    for (const g of lesson.grammar.slice(from, to)) {
      tasks.push({ ...base, id: `${key}:grammar:${g.id}`, kind: 'grammar', label: `Grammar: ${g.title}`, units: 1, step: 'grammar', ref: g.id });
    }
  };

  const dialogue = (i: number) => {
    const d = lesson.dialogues[i];
    if (!d) return;
    tasks.push({ ...base, id: `${key}:dialogue:${d.id}`, kind: 'dialogue', label: `Dialogue ${i + 1}: ${d.title}`, units: 1, step: 'dialogues', ref: d.id });
  };

  for (const part of [1, 2] as const) {
    book(`Part ${part} text`);
    book(`Part ${part} vocabulary`);
    words(part);
    book(`Part ${part} grammar`);
    if (part === 1) grammar(0, half);
    else grammar(half, lesson.grammar.length);
    dialogue(part - 1);
    book(`Part ${part} practice`);
  }
  // Any further dialogues, then the other book sections in page order.
  for (let i = 2; i < lesson.dialogues.length; i++) dialogue(i);
  for (const s of sections) if (!KNOWN_SECTIONS.includes(s.section)) book(s.section);

  lesson.exercises.forEach((e, i) => {
    tasks.push({ ...base, id: `${key}:ex:${e.id}`, kind: 'exercise', label: `Exercises E${i + 1}: ${e.title}`, units: 1, step: 'exercises', ref: e.id });
  });
  if (lesson.speaking.length > 0) {
    tasks.push({ ...base, id: `${key}:speaking`, kind: 'speaking', label: 'Speaking prompts, said aloud', units: 1, step: 'speaking' });
  }
  return tasks;
}

/** Every lesson's tasks, lesson after lesson (lessons in level, then lesson order). */
export const planTasks = (lessons: Lesson[]): PlanTask[] => lessons.flatMap(lessonTasks);
