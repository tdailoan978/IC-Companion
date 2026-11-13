import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Lesson, VocabItem } from '../../lib/content/types.ts';
import { useDeepLink, withDeepLink } from '../../lib/deeplink.ts';
import { useLessonProgress } from '../../lib/progress.ts';
import { resolveSlice, resolveWord, type WordSlice } from '../deeplink/links.ts';
import { revealHeading } from '../deeplink/reveal.ts';
import { ReturnBar } from '../deeplink/ReturnBar.tsx';
import { lessonPath } from '../lesson/steps.ts';
import { Flashcards } from './Flashcards.tsx';
import { VocabList, vocabRowId } from './VocabList.tsx';
import './vocab.css';

type Mode = 'list' | 'cards';
type Part = 1 | 2;

/**
 * Vocabulary step (PLAN.md 5.2 step 2): Part 1 / Part 2, as a list or as flashcards.
 * Opened for a study-plan word slice (?item=p1.s2), it runs flashcards of only that slice.
 * Opened for one word (?item=L11.v.12, a note's "Go to item"), it shows that word's part as a list,
 * scrolled to the word's row, which is briefly highlighted.
 */
export function VocabStep({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson);
  const link = useDeepLink();
  const slice = useMemo(() => resolveSlice(lesson, link.item), [lesson, link.item]);
  const word = useMemo(() => resolveWord(lesson, link.item), [lesson, link.item]);
  const parts = [...new Set(lesson.vocab.map((v) => v.part))].sort() as Part[];
  const [part, setPart] = useState<Part>(word?.part ?? parts[0] ?? 1);
  const [mode, setMode] = useState<Mode>('list');
  // A part's flashcards mount the first time they are opened (that starts the part's run and its
  // timer), then stay mounted while I peek at the list or the other part, so each deck keeps its place.
  const [openedParts, setOpenedParts] = useState<Part[]>([]);
  const open = (p: Part) => setOpenedParts((list) => (list.includes(p) ? list : [...list, p]));
  const [reverse, setReverse] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [highlight, setHighlight] = useState<string>();

  // One word: its part's list, scrolled to its row and highlighted for a moment. No flashcard run starts.
  useEffect(() => {
    if (!word) return;
    setPart(word.part);
    setMode('list');
    setHighlight(word.id);
    // In a timeout, after the list has rendered and the screen's scroll-to-top has run.
    const later = setTimeout(() => {
      const row = document.getElementById(vocabRowId(word.id));
      if (row) revealHeading(row, row.querySelector<HTMLElement>('.vocab-row'));
    });
    const fade = setTimeout(() => setHighlight(undefined), 2500);
    return () => {
      clearTimeout(later);
      clearTimeout(fade);
    };
  }, [word]);

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

  const header = (
    <header>
      <p className="eyebrow">Lesson {lesson.lesson} · Vocabulary</p>
      <h1>Vocabulary</h1>
    </header>
  );

  if (slice) {
    // "All words" leaves the slice but keeps the plan bar.
    const allWords = withDeepLink(lessonPath(lesson.level, lesson.id, 'vocab'), { fromPlan: link.fromPlan, task: link.task });
    return (
      <article className="step vocab">
        <ReturnBar />
        {header}
        {/* key: the next slice (from the plan bar's "Next") starts a fresh run. */}
        <SliceView
          key={slice.key}
          lesson={lesson}
          slice={slice}
          allWords={allWords}
          reverse={reverse}
          onReverse={setReverse}
          shuffle={shuffle}
          onShuffle={setShuffle}
        />
      </article>
    );
  }

  return (
    <article className="step vocab">
      <ReturnBar />
      {header}

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
        <ModeSwitch mode={mode} onChange={chooseMode} />
      </div>

      {mode === 'list' && <VocabList lesson={lesson} words={words} highlight={highlight} />}
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

function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Mode">
      <button type="button" className="segmented-option" aria-pressed={mode === 'list'} onClick={() => onChange('list')}>
        List
      </button>
      <button type="button" className="segmented-option" aria-pressed={mode === 'cards'} onClick={() => onChange('cards')}>
        Flashcards
      </button>
    </div>
  );
}

type SliceProps = {
  lesson: Lesson;
  slice: WordSlice;
  allWords: string;
  reverse: boolean;
  onReverse: (on: boolean) => void;
  shuffle: boolean;
  onShuffle: (on: boolean) => void;
};

/** One plan slice: its flashcard run (in memory only) and its word list. */
function SliceView({ lesson, slice, allWords, reverse, onReverse, shuffle, onShuffle }: SliceProps) {
  const [mode, setMode] = useState<Mode>('cards');
  const words = useMemo(() => {
    const byId = new Map(lesson.vocab.map((v) => [v.id, v]));
    return slice.wordIds.flatMap((id): VocabItem[] => {
      const v = byId.get(id);
      return v ? [v] : [];
    });
  }, [lesson, slice]);

  return (
    <>
      <div className="vocab-controls vocab-slice-controls">
        <p className="vocab-slice-title">
          <span className="visually-hidden">Study plan slice: </span>
          {slice.label}
        </p>
        <ModeSwitch mode={mode} onChange={setMode} />
        <Link className="button button-quiet vocab-slice-all" to={allWords}>
          All words
        </Link>
      </div>
      {mode === 'list' && <VocabList lesson={lesson} words={words} />}
      <div hidden={mode !== 'cards'}>
        <Flashcards
          lesson={lesson}
          part={slice.part}
          words={words}
          reverse={reverse}
          onReverse={onReverse}
          shuffle={shuffle}
          onShuffle={onShuffle}
          onSwitchPart={() => {}}
          onShowList={() => setMode('list')}
          slice={slice}
        />
      </div>
    </>
  );
}
