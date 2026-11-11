import type { Lesson } from '../../lib/content/types.ts';

/** Placeholder: replaced by the Dialogues screen. */
export function DialogueStep({ lesson }: { lesson: Lesson }) {
  return <p className="muted">Dialogues for lesson {lesson.lesson} is being built.</p>;
}
