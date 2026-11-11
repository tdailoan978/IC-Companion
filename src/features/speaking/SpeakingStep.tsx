import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '../../lib/content/types.ts';
import { logActivity, markSpeakingDone, useLessonProgress } from '../../lib/progress.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import './speaking.css';

/**
 * Speaking step (PLAN.md 5.2 step 6): the lesson's prompts one card at a time, to answer aloud.
 * "Finish" on the last card ticks the step and logs the time for the study plan (PLAN.md 9.1).
 */
export function SpeakingStep({ lesson }: { lesson: Lesson }) {
  const prompts = lesson.speaking;
  const timer = useActiveTimer();
  const { progress } = useLessonProgress(lesson);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const cardHeading = useRef<HTMLParagraphElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // After Previous/Next, put focus on the new question so a keyboard or VoiceOver user hears it.
  useEffect(() => {
    if (moved.current) cardHeading.current?.focus();
  }, [index]);
  useEffect(() => {
    if (finished) doneHeading.current?.focus();
  }, [finished]);

  if (prompts.length === 0) return <p className="muted">This lesson has no speaking prompts.</p>;

  const go = (next: number) => {
    moved.current = true;
    setIndex(next);
    setRevealed(false);
  };

  const finish = () => {
    setFinished(true);
    void markSpeakingDone(lesson);
    void logActivity(lesson, 'speaking', `${lesson.id}.speaking`, timer.elapsed(), prompts.length);
  };

  const again = () => {
    moved.current = false;
    setIndex(0);
    setRevealed(false);
    setFinished(false);
    timer.reset();
  };

  const prompt = prompts[index];
  const last = index === prompts.length - 1;

  return (
    <article className="step speaking">
      <header>
        <p className="eyebrow">Lesson {lesson.lesson} · Speaking</p>
        <h1>Speaking</h1>
        <p className="muted speaking-intro">Answer each question aloud, in full sentences.</p>
      </header>

      {finished ? (
        <section className="speaking-done" aria-labelledby="speaking-done-heading">
          <h2 id="speaking-done-heading" ref={doneHeading} tabIndex={-1}>
            <span aria-hidden="true">✓ </span>Speaking done
          </h2>
          <p>You answered all {prompts.length} prompts.</p>
          <div className="speaking-done-actions">
            <button type="button" className="button button-quiet" onClick={again}>
              Go through them again
            </button>
          </div>
        </section>
      ) : (
        <section className="speaking-card" aria-label={`Prompt ${index + 1} of ${prompts.length}`}>
          <p className="speaking-count">
            {index + 1} of {prompts.length}
            {progress.speakingDone && <span className="speaking-count-done"> · finished before</span>}
          </p>

          <p lang="zh-Hans" className="speaking-zh" ref={cardHeading} tabIndex={-1}>
            {prompt.zh}
          </p>

          <div className="speaking-hear">
            <span className="speaking-hear-item">
              <SpeakButton text={prompt.zh} label="Hear the question" />
              <span aria-hidden="true">Hear the question</span>
            </span>
            <span className="speaking-hear-item">
              <SpeakButton text={prompt.zh} label="Hear it slowly" slow />
              <span aria-hidden="true">Slowly</span>
            </span>
          </div>

          <button
            type="button"
            className="toggle-chip speaking-reveal"
            aria-expanded={revealed}
            aria-controls="speaking-answer"
            onClick={() => setRevealed((r) => !r)}
          >
            {revealed ? 'Hide pinyin and English' : 'Show pinyin and English'}
          </button>
          <div id="speaking-answer" className="speaking-reveal-body" hidden={!revealed}>
            <p className="pinyin speaking-pinyin">{prompt.pinyin}</p>
            <p className="speaking-en">{prompt.en}</p>
          </div>
        </section>
      )}

      {!finished && (
        <nav className="speaking-nav" aria-label="Prompts">
          <button type="button" className="button button-quiet" disabled={index === 0} onClick={() => go(index - 1)}>
            <span aria-hidden="true">←</span> Previous
          </button>
          {last ? (
            <button type="button" className="button" onClick={finish}>
              Finish
            </button>
          ) : (
            <button type="button" className="button" onClick={() => go(index + 1)}>
              Next <span aria-hidden="true">→</span>
            </button>
          )}
        </nav>
      )}
    </article>
  );
}
