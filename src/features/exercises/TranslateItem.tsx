import { useState } from 'react';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { MixedText } from '../../app/MixedText.tsx';
import { Feedback } from './Feedback.tsx';

type Item = { id: string; en: string; answer: string };

/**
 * English → Chinese, answered aloud or on paper. More than one translation can
 * be right, so this never grades: I reveal the model answer and mark myself.
 */
export function TranslateItem({ item, onAnswer }: { item: Item; onAnswer: (ok: boolean) => void }) {
  const [shown, setShown] = useState(false);
  const [marked, setMarked] = useState<boolean | null>(null);

  const mark = (ok: boolean) => {
    if (marked !== null) return;
    setMarked(ok);
    onAnswer(ok);
  };

  return (
    <div className="ex-item">
      <p className="ex-instruction muted">Say it in Chinese, or write it down, then check.</p>
      <p className="ex-english">
        <MixedText text={item.en} />
      </p>

      {!shown ? (
        <div className="ex-actions">
          <button type="button" className="button" onClick={() => setShown(true)}>
            Show answer
          </button>
        </div>
      ) : (
        <>
          <div className="ex-model">
            <p className="ex-model-label muted">Model answer</p>
            <div className="ex-answer-row">
              <span lang="zh-Hans" className="ex-model-zh">{item.answer}</span>
              <SpeakButton text={item.answer} label="Hear the model answer" />
            </div>
          </div>
          {marked === null && (
            <div className="ex-actions" role="group" aria-label="How did you do?">
              <button type="button" className="button" onClick={() => mark(true)}>
                <span aria-hidden="true">✓</span> Got it
              </button>
              <button type="button" className="button button-quiet" onClick={() => mark(false)}>
                <span aria-hidden="true">↻</span> Not yet
              </button>
            </div>
          )}
        </>
      )}

      <Feedback ok={marked}>
        <p>{marked ? 'Marked as got it.' : 'Marked as not yet: it comes back in “Retry the wrong ones”.'}</p>
      </Feedback>
    </div>
  );
}
