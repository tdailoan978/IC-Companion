import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { findLesson } from '../../lib/content/lessons.ts';
import { loadLastLocation, type LastLocation } from '../../lib/storage.ts';
import { isStepKey, lessonPath, stepInfo } from '../lesson/steps.ts';

/** Jumps back to the last lesson step visited. Hidden until there is one. */
export function ContinueButton() {
  const [last, setLast] = useState<LastLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadLastLocation().then((loc) => {
      if (!cancelled) setLast(loc);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const lesson = last && findLesson(last.level, last.id);
  if (!last || !lesson || !isStepKey(last.step)) return null;

  return (
    <Link to={lessonPath(lesson.level, lesson.id, last.step)} className="button continue-button">
      <span className="continue-kicker">Continue</span>
      <span>
        Lesson {lesson.lesson}{' '}
        <span lang="zh-Hans" className="zh">
          {lesson.titleZh}
        </span>{' '}
        · {stepInfo(last.step).label}
      </span>
    </Link>
  );
}
