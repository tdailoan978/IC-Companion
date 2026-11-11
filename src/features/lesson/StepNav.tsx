import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import type { Lesson } from '../../lib/content/types.ts';
import { STEPS } from './steps.ts';
import { useLessonProgress } from '../../lib/progress.ts';

/** The six steps. A sidebar on wide screens, a scrollable bar on narrow ones. */
export function StepNav({ lesson }: { lesson: Lesson }) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { progress } = useLessonProgress(lesson);

  // In the narrow bar, centre the current step (horizontal scroll only;
  // in the sidebar layout the nav does not scroll, so this does nothing).
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !current) return;
    nav.scrollTo({ left: current.offsetLeft - (nav.clientWidth - current.offsetWidth) / 2 });
  }, [pathname]);

  return (
    <nav className="step-nav" aria-label="Lesson steps" ref={navRef}>
      <p className="step-nav-heading">
        Lesson {lesson.lesson}{' '}
        <span lang="zh-Hans" className="zh">
          {lesson.titleZh}
        </span>
      </p>
      <ol className="step-list">
        {STEPS.map((step) => (
          <li key={step.key}>
            <NavLink to={step.key} className="step-link" replace>
              <span className="step-tick" data-done={Boolean(progress.steps[step.key])} aria-hidden="true" />
              <span className="step-label">{step.label}</span>
              {progress.steps[step.key] && <span className="visually-hidden"> (done)</span>}
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
