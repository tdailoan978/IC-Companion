import type { Lesson } from '../../lib/content/types.ts';

/** Placeholder: replaced by the Grammar screen. */
export function GrammarStep({ lesson }: { lesson: Lesson }) {
  return <p className="muted">Grammar for lesson {lesson.lesson} is being built.</p>;
}
