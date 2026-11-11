import { useState } from 'react';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { Feedback } from './Feedback.tsx';
import { seededShuffle } from './shuffle.ts';

type Item = { id: string; prompt: string; options: string[]; answer: string };

/** A sentence with one blank and three word buttons. */
export function ChoiceItem({ item, seed, onAnswer }: { item: Item; seed: string; onAnswer: (ok: boolean) => void }) {
  // The source lists the answer first, so the options are shuffled (once, seeded).
  const [options] = useState(() => seededShuffle(item.options, seed));
  const [picked, setPicked] = useState<string | null>(null);
  const blank = item.prompt.indexOf('___');
  const before = blank < 0 ? item.prompt : item.prompt.slice(0, blank);
  const after = blank < 0 ? '' : item.prompt.slice(blank + 3);
  const complete = before + item.answer + after;
  const ok = picked === null ? null : picked === item.answer;

  return (
    <div className="ex-item">
      <p className="ex-instruction muted">Choose the word that fills the gap.</p>
      <p className="ex-sentence" lang="zh-Hans">
        {before}
        <span className="ex-blank" data-filled={picked !== null}>
          {picked === null ? <span className="visually-hidden" lang="en">blank</span> : item.answer}
        </span>
        {after}
      </p>

      <div className="ex-options" role="group" aria-label="Options">
        {options.map((option) => {
          const state = picked === null ? undefined : option === item.answer ? 'right' : option === picked ? 'wrong' : 'other';
          return (
            <button
              key={option}
              type="button"
              className="ex-option"
              data-state={state}
              disabled={picked !== null}
              onClick={() => {
                if (picked !== null) return;
                setPicked(option);
                onAnswer(option === item.answer);
              }}
            >
              {state === 'right' && <span aria-hidden="true">✓ </span>}
              {state === 'wrong' && <span aria-hidden="true">✗ </span>}
              <span lang="zh-Hans">{option}</span>
              {state === 'right' && <span className="visually-hidden"> (the answer)</span>}
              {state === 'wrong' && <span className="visually-hidden"> (your pick)</span>}
            </button>
          );
        })}
      </div>

      <Feedback ok={ok}>
        <p>
          {ok ? 'Right.' : (
            <>
              You picked <span lang="zh-Hans" className="zh-inline">{picked}</span>; the answer is{' '}
              <span lang="zh-Hans" className="zh-inline">{item.answer}</span>.
            </>
          )}
        </p>
        <div className="ex-answer-row">
          <span lang="zh-Hans" className="ex-answer-zh">{complete}</span>
          <SpeakButton text={complete} label="Hear the whole sentence" />
        </div>
      </Feedback>
    </div>
  );
}
