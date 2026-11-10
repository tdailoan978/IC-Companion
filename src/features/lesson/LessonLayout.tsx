import { Outlet, useParams } from 'react-router';
import { findLesson } from '../../lib/content/lessons.ts';
import { NotFound } from '../../app/NotFound.tsx';
import { StepNav } from './StepNav.tsx';
import './lesson.css';

/** Lesson frame: step sidebar (wide) or step bar (narrow), and the current step. */
export function LessonLayout() {
  const { level, id } = useParams();
  const lesson = findLesson(level, id);
  if (!lesson) {
    return <NotFound title="Lesson not found" message={`There is no lesson ${id ?? ''} in level ${level ?? ''}.`} />;
  }
  return (
    <div className="lesson">
      <StepNav lesson={lesson} />
      <div className="lesson-content">
        <Outlet context={lesson} />
      </div>
    </div>
  );
}
