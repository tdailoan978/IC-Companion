import type { Lesson } from '../lib/content/types.ts';
import { setStepTicked, useLessonProgress, type StepKey } from '../lib/progress.ts';

/**
 * The tick at the end of a step. Steps tick themselves when their activity is
 * finished; this button lets me tick or untick by hand (nothing is locked).
 */
export function StepDone({ lesson, step, hint }: { lesson: Lesson; step: StepKey; hint?: string }) {
  const { progress } = useLessonProgress(lesson);
  const done = Boolean(progress.steps[step]);
  return (
    <div className="step-done">
      <button
        type="button"
        className={`button ${done ? 'button-quiet' : ''}`}
        aria-pressed={done}
        onClick={() => void setStepTicked(lesson, step, !done)}
      >
        <span className="step-done-mark" aria-hidden="true">{done ? '✓' : '○'}</span>
        {done ? 'Step done' : 'Mark step done'}
      </button>
      {hint && !done && <p className="muted step-done-hint">{hint}</p>}
    </div>
  );
}
