import type { Lesson } from '../../lib/content/types.ts';
import { stepInfo, type StepKey } from './steps.ts';

/** What this lesson has for the step, so the placeholder shows the content loaded. */
function contentSummary(lesson: Lesson, step: StepKey): string {
  switch (step) {
    case 'vocab':
      return `${lesson.vocab.length} words in two parts.`;
    case 'grammar':
      return `${lesson.grammar.length} grammar points.`;
    case 'dialogues':
      return `${lesson.dialogues.length} dialogues: ${lesson.dialogues.map((d) => `“${d.title}”`).join(' and ')}.`;
    case 'exercises':
      return `${lesson.exercises.length} exercise sets.`;
    case 'speaking':
      return `${lesson.speaking.length} speaking prompts.`;
    default:
      return '';
  }
}

export function ComingSoonStep({ lesson, step }: { lesson: Lesson; step: StepKey }) {
  const info = stepInfo(step);
  return (
    <article className="step coming-soon">
      <h1>
        {info.label}{' '}
        <span lang="zh-Hans" className="zh-inline">
          {info.labelZh}
        </span>
      </h1>
      <p className="coming-soon-note">Coming in milestone {info.comingIn}.</p>
      <p className="muted">This lesson has {contentSummary(lesson, step)}</p>
    </article>
  );
}
