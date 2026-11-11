import type { Lesson } from '../../lib/content/types.ts';
import { isLessonComplete, useLessonProgress } from '../../lib/progress.ts';

function useCompleteCount(lessons: Lesson[]): number {
  // The lesson list is fixed for the life of the app, so the hook order never changes.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return lessons.map((lesson) => useLessonProgress(lesson).progress).filter(isLessonComplete).length;
}

/** "Level 2 · 3 of 10 lessons complete": the volume milestone (PLAN.md 9.1). */
export function LevelHeading({ level, lessons }: { level: number; lessons: Lesson[] }) {
  const done = useCompleteCount(lessons);
  const all = done === lessons.length && lessons.length > 0;
  return (
    <h2 id={`level-${level}`} className="level-heading">
      Level {level}
      <span className="level-count" data-complete={all || undefined}>
        {all ? '✓ Volume complete' : `${done} of ${lessons.length} lessons complete`}
      </span>
    </h2>
  );
}
