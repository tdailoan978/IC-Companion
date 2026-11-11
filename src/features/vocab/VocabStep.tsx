import type { Lesson } from '../../lib/content/types.ts';

/** Placeholder: replaced by the Vocabulary screen. */
export function VocabStep({ lesson }: { lesson: Lesson }) {
  return <p className="muted">Vocabulary for lesson {lesson.lesson} is being built.</p>;
}
