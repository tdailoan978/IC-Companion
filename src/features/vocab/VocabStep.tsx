import { useState } from 'react';
import type { Lesson } from '../../lib/content/types.ts';
import { useLessonProgress } from '../../lib/progress.ts';
import { Flashcards } from './Flashcards.tsx';
import { VocabList } from './VocabList.tsx';
import './vocab.css';

type Mode = 'list' | 'cards';
type Part = 1 | 2;

/** Vocabulary step (PLAN.md 5.2 step 2): Part 1 / Part 2, as a list or as flashcards. */
export function VocabStep({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson);
  const parts = [...new Set(lesson.vocab.map((v) => v.part))].sort() as Part[];
  const [part, setPart] = useState<Part>(parts[0] ?? 1);
  const [mode, setMode] = useState<Mode>('list');
  // A part's flashcards mount the first time they are opened (that starts the part's run and its
  // timer), then stay mounted while I peek at the list or the other part, so each deck keeps its place.
  const [openedParts, setOpenedParts] = useState<Part[]>([]);
  const open = (p: Part) => setOpenedParts((list) => (list.includes(p) ? list : [...list, p]));
  const [reverse, setReverse] = useState(false);
  const [shuffle, setShuffle] = useState(false);

  const words = lesson.vocab.filter((v) => v.part === part);
  const otherPart = parts.find((p) => p !== part);

  const choosePart = (next: Part) => {
    setPart(next);
    if (mode === 'cards') open(next);
  };
  const chooseMode = (next: Mode) => {
    setMode(next);
    if (next === 'cards') open(part);
  };

  if (lesson.vocab.length === 0) {
    return <p className="muted">This lesson has no vocabulary list.</p>;
  }

  return (
    <article className="step vocab">
      <header>
        <p className="eyebrow">Lesson {lesson.lesson} · Vocabulary</p>
        <h1>Vocabulary</h1>
      </header>

      <div className="vocab-controls">
        {parts.length > 1 && (
          <div className="segmented" role="group" aria-label="Part">
            {parts.map((p) => {
              const count = lesson.vocab.filter((v) => v.part === p).length;
              const done = Boolean(progress.vocabParts[String(p) as '1' | '2']);
              return (
                <button key={p} type="button" className="segmented-option" aria-pressed={part === p} onClick={() => choosePart(p)}>
                  Part {p}
                  <span className="segmented-count">
                    {count}
                    <span className="visually-hidden"> words</span>
                  </span>
                  {done && (
                    <span className="vocab-part-done">
                      <span aria-hidden="true">✓</span>
                      <span className="visually-hidden">, flashcards finished</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        <div className="segmented" role="group" aria-label="Mode">
          <button type="button" className="segmented-option" aria-pressed={mode === 'list'} onClick={() => chooseMode('list')}>
            List
          </button>
          <button type="button" className="segmented-option" aria-pressed={mode === 'cards'} onClick={() => chooseMode('cards')}>
            Flashcards
          </button>
        </div>
      </div>

      {mode === 'list' && <VocabList words={words} />}
      {openedParts.map((p) => (
        <div key={p} hidden={mode !== 'cards' || p !== part}>
          <Flashcards
            lesson={lesson}
            part={p}
            words={lesson.vocab.filter((v) => v.part === p)}
            reverse={reverse}
            onReverse={setReverse}
            shuffle={shuffle}
            onShuffle={setShuffle}
            otherPart={otherPart}
            onSwitchPart={choosePart}
            onShowList={() => chooseMode('list')}
          />
        </div>
      ))}
    </article>
  );
}
