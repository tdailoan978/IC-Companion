import { lessonsByLevel } from '../../lib/content/lessons.ts';
import { BuildStamp } from '../../app/BuildStamp.tsx';
import { ContinueButton } from './ContinueButton.tsx';
import { LessonCard } from './LessonCard.tsx';
import { ReviewDueButton } from '../review/ReviewDueButton.tsx';
import { TodayCard } from '../plan/TodayCard.tsx';
import './home.css';

export function HomePage() {
  return (
    <div className="page home">
      <TodayCard />
      <div className="home-actions">
        <ReviewDueButton />
        <ContinueButton />
      </div>

      {lessonsByLevel.map(({ level, lessons }) => (
        <section key={level} className="level" aria-labelledby={`level-${level}`}>
          <h2 id={`level-${level}`}>Level {level}</h2>
          <ul className="lesson-grid">
            {lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={lesson} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {lessonsByLevel.length === 0 && <p className="muted">No lessons were found in the content bundle.</p>}

      <footer className="home-footer">
        <BuildStamp />
      </footer>
    </div>
  );
}
