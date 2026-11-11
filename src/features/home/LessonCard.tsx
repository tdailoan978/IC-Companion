import { Link } from 'react-router';
import type { Lesson } from '../../lib/content/types.ts';
import { ProgressRing } from '../../app/ProgressRing.tsx';
import { lessonPath } from '../lesson/steps.ts';
import { completion, useLessonProgress } from '../../lib/progress.ts';

export function LessonCard({ lesson }: { lesson: Lesson }) {
  const progress = completion(useLessonProgress(lesson).progress);
  return (
    <Link to={lessonPath(lesson.level, lesson.id)} className="lesson-card">
      <ProgressRing value={progress}>
        <span className="visually-hidden">Lesson </span>
        {lesson.lesson}
      </ProgressRing>
      <span className="lesson-card-text">
        <span lang="zh-Hans" className="lesson-card-zh">
          {lesson.titleZh}
        </span>
        <span className="lesson-card-en">{lesson.titleEn}</span>
      </span>
    </Link>
  );
}
