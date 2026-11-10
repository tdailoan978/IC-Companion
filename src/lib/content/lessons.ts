// Typed access to the lesson bundle that scripts/build-content.ts writes.

import bundleJson from '../../generated/lessons.json';
import type { Lesson, LessonBundle } from './types.ts';

const bundle = bundleJson as unknown as LessonBundle;

export type LevelGroup = { level: number; lessons: Lesson[] };

/** Every lesson, ordered by level then lesson number. */
export const allLessons: Lesson[] = [...bundle.lessons].sort(
  (a, b) => a.level - b.level || a.lesson - b.lesson,
);

/** Lessons grouped by level, lowest level first. */
export const lessonsByLevel: LevelGroup[] = (() => {
  const groups = new Map<number, Lesson[]>();
  for (const lesson of allLessons) {
    const list = groups.get(lesson.level) ?? [];
    list.push(lesson);
    groups.set(lesson.level, list);
  }
  return [...groups].map(([level, lessons]) => ({ level, lessons }));
})();

/** Finds a lesson by level and id. `level` may come straight from the URL. */
export function findLesson(level: number | string | undefined, id: string | undefined): Lesson | undefined {
  const lvl = typeof level === 'string' ? Number(level) : level;
  if (lvl === undefined || !Number.isInteger(lvl) || !id) return undefined;
  return allLessons.find((l) => l.level === lvl && l.id === id);
}

/** When the content bundle was built (ISO string). */
export const contentGeneratedAt = bundle.generatedAt;
