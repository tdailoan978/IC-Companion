import type { Lesson } from '../../lib/content/types.ts';

/** Placeholder: replaced by the Speaking screen. */
export function SpeakingStep({ lesson }: { lesson: Lesson }) {
  return <p className="muted">Speaking for lesson {lesson.lesson} is being built.</p>;
}
