import { useEffect, useState } from 'react';
import { getSettings } from '../../lib/settings.ts';
import type { GrammarPoint, Lesson } from '../../lib/content/types.ts';
import { logActivity, markGrammarDone, useLessonProgress } from '../../lib/progress.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { useDeepLink } from '../../lib/deeplink.ts';
import { MixedText } from '../../app/MixedText.tsx';
import { Sentence } from '../../app/Sentence.tsx';
import { ToggleChip } from '../../app/ToggleChip.tsx';
import { ReturnBar } from '../deeplink/ReturnBar.tsx';
import { revealHeading } from '../deeplink/reveal.ts';
import { NoteButton } from '../notes/NoteButton.tsx';
import { paragraphs, patternPieces, understoodCount } from './grammar.ts';
import './grammar.css';

/** PLAN.md 5.2 step 3: one card per grammar point, each marked "Got it" when understood. */
export function GrammarStep({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson);
  const [showPinyin, setShowPinyin] = useState(getSettings().showPinyin);
  const [showEnglish, setShowEnglish] = useState(true);
  // Active time since the screen opened or since the previous "Got it" (PLAN.md 9.1).
  const timer = useActiveTimer();
  const { item } = useDeepLink();

  // Opened for one grammar point (?item=L11.g.3, e.g. from the study plan): bring its card into
  // view and put focus on its heading. In a timeout, so the screen's scroll-to-top runs first.
  useEffect(() => {
    if (!item || !lesson.grammar.some((g) => g.id === item)) return;
    const later = setTimeout(() => {
      const heading = document.getElementById(headingIdOf(item));
      if (heading) revealHeading(heading);
    });
    return () => clearTimeout(later);
  }, [item, lesson]);

  if (lesson.grammar.length === 0) {
    return <p className="muted">This lesson has no grammar points.</p>;
  }

  const understood = understoodCount(lesson.grammar, progress.grammarDone);

  const setGotIt = (g: GrammarPoint, done: boolean) => {
    void markGrammarDone(lesson, g.id, done);
    if (done) {
      void logActivity(lesson, 'grammar', g.id, timer.elapsed());
      timer.reset();
    }
  };

  return (
    <div className="grammar-step">
      <ReturnBar />
      <header className="grammar-head">
        <h1 className="grammar-heading">Grammar</h1>
        <p className="grammar-count" aria-live="polite">
          <strong>{understood}</strong> of {lesson.grammar.length} understood
        </p>
      </header>

      <div className="toggle-row" role="group" aria-label="Show in the examples">
        <ToggleChip label="Pinyin" on={showPinyin} onChange={setShowPinyin} />
        <ToggleChip label="English" on={showEnglish} onChange={setShowEnglish} />
      </div>

      <ol className="grammar-list">
        {lesson.grammar.map((g, i) => (
          <li key={g.id}>
            <GrammarCard
              point={g}
              lesson={lesson}
              number={i + 1}
              done={Boolean(progress.grammarDone[g.id])}
              showPinyin={showPinyin}
              showEnglish={showEnglish}
              onGotIt={(done) => setGotIt(g, done)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

const headingIdOf = (grammarId: string) => `grammar-${grammarId}`;

type CardProps = {
  point: GrammarPoint;
  lesson: Lesson;
  number: number;
  done: boolean;
  showPinyin: boolean;
  showEnglish: boolean;
  onGotIt: (done: boolean) => void;
};

function GrammarCard({ point, lesson, number, done, showPinyin, showEnglish, onGotIt }: CardProps) {
  const headingId = headingIdOf(point.id);
  const pieces = patternPieces(point.patternParts);
  return (
    <article className="grammar-card" data-done={done} aria-labelledby={headingId}>
      <h2 id={headingId} className="grammar-title" tabIndex={-1}>
        <span className="grammar-number">G{number}</span>
        <span className="grammar-title-text">
          <MixedText text={point.title} />
        </span>
      </h2>

      {pieces.length > 0 && (
        <div className="grammar-pattern" role="group" aria-label="Pattern">
          {pieces.map((piece, i) => (
            <p key={i} className={piece.kind === 'code' ? 'grammar-pattern-code' : 'grammar-pattern-join'}>
              <MixedText text={piece.text} />
            </p>
          ))}
          {point.patternNote && (
            <p className="grammar-pattern-note">
              <MixedText text={point.patternNote} />
            </p>
          )}
        </div>
      )}

      <div className="grammar-explanation">
        {paragraphs(point.explanationMd).map((p, i) => (
          <p key={i}>
            <MixedText text={p} />
          </p>
        ))}
      </div>

      {point.examples.length > 0 && (
        <ul className="grammar-examples" aria-label={`Examples for G${number}, tap one to hear it`}>
          {point.examples.map((ex) => (
            <li key={ex.zh}>
              <Sentence sentence={ex} showPinyin={showPinyin} showEnglish={showEnglish} />
            </li>
          ))}
        </ul>
      )}

      {point.watchOut && (
        <aside className="grammar-watch" aria-label="Watch out">
          <p className="grammar-watch-label" aria-hidden="true">
            Watch out
          </p>
          <p className="grammar-watch-text">
            <MixedText text={point.watchOut} />
          </p>
        </aside>
      )}

      <div className="grammar-card-foot">
        <NoteButton note={{ level: lesson.level, lessonId: lesson.id, kind: 'grammar', ref: point.id }} label={`Grammar G${number}`} />
        <button
          type="button"
          className={`button grammar-got-it ${done ? 'button-quiet' : ''}`}
          aria-pressed={done}
          aria-label={`Got it, G${number}`}
          onClick={() => onGotIt(!done)}
        >
          <span className="grammar-got-it-mark" aria-hidden="true">
            {done ? '✓' : '○'}
          </span>
          Got it
        </button>
      </div>
    </article>
  );
}
