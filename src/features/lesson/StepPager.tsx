import { Link } from 'react-router';
import type { Lesson } from '../../lib/content/types.ts';
import { STEPS, lessonPath, type StepKey } from './steps.ts';

/** Previous / next step buttons at the bottom of each step. */
export function StepPager({ lesson, step }: { lesson: Lesson; step: StepKey }) {
  const i = STEPS.findIndex((s) => s.key === step);
  const prev = STEPS[i - 1];
  const next = STEPS[i + 1];
  return (
    <nav className="step-pager" aria-label="Previous and next step">
      {prev ? (
        <Link to={lessonPath(lesson.level, lesson.id, prev.key)} className="button button-quiet" replace>
          ‹ {prev.label}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link to={lessonPath(lesson.level, lesson.id, next.key)} className="button" replace>
          {next.label} ›
        </Link>
      )}
    </nav>
  );
}
