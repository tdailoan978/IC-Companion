import { lessonsByLevel } from '../../lib/content/lessons.ts';
import { BuildStamp } from '../../app/BuildStamp.tsx';
import { ContinueButton } from './ContinueButton.tsx';
import { LessonCard } from './LessonCard.tsx';
import './home.css';

export function HomePage() {
  return (
    <div className="page home">
      <div className="home-actions">
        {/* Milestone 5: the "Review due: N" button goes here. */}
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
