import type { Lesson } from '../../lib/content/types.ts';

/** Placeholder: replaced by the Exercises screen. */
export function ExercisesStep({ lesson }: { lesson: Lesson }) {
  return <p className="muted">Exercises for lesson {lesson.lesson} is being built.</p>;
}
