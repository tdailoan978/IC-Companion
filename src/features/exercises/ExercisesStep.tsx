import { useEffect, useRef, useState, type RefObject } from 'react';
import type { ExerciseSet, Lesson } from '../../lib/content/types.ts';
import { logActivity, recordExerciseAnswer, recordExerciseSet, useLessonProgress } from '../../lib/progress.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { answerItem, currentItem, finishRun, isAnswered, isFinished, nextItem, positionLabel, score, startRun, wrongIds, type Run } from './run.ts';
import { ChoiceItem } from './ChoiceItem.tsx';
import { OrderItem } from './OrderItem.tsx';
import { TranslateItem } from './TranslateItem.tsx';
import { MatchBoard } from './MatchBoard.tsx';
import './exercises.css';

const TYPE_LABELS: Record<ExerciseSet['type'], string> = {
  choice: 'Fill the gap',
  order: 'Word order',
  translate: 'Translate, then mark yourself',
  match: 'Match words and meanings',
};

/** "L11.e2" → "E2". */
const setLabel = (set: ExerciseSet) => set.id.split('.').pop()?.toUpperCase() ?? set.id;

type Active = { set: ExerciseSet; run: Run; n: number };

/** The Exercises step: the four sets, then one run at a time with feedback, a score and a retry of the misses. */
export function ExercisesStep({ lesson }: { lesson: Lesson }) {
  const { progress } = useLessonProgress(lesson);
  const timer = useActiveTimer();
  // A fresh shuffle each time a run starts, but a fixed one for the run's lifetime.
  const [nonce] = useState(() => Math.random().toString(36).slice(2, 8));
  const runCount = useRef(0);
  const [active, setActive] = useState<Active | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const returning = useRef(false);

  // Move focus (and the scroll position) to the top of each new item, the score, or back to the set list.
  const finished = active ? isFinished(active.run) : false;
  const focusKey = active ? `${active.n}:${active.run.index}:${finished}` : 'sets';
  useEffect(() => {
    if (focusKey !== 'sets') headingRef.current?.focus();
    else if (returning.current) listHeadingRef.current?.focus();
  }, [focusKey]);

  const begin = (set: ExerciseSet, ids: string[], retry: boolean) => {
    runCount.current += 1;
    if (!retry) timer.reset();
    setActive({ set, run: startRun(ids, retry), n: runCount.current });
  };

  const backToSets = () => {
    returning.current = true;
    setActive(null);
  };

  // Every answer is saved at once, so closing the app mid-set loses nothing.
  const onAnswer = (itemId: string, ok: boolean) => {
    setActive((a) => {
      if (!a || isAnswered(a.run, itemId)) return a;
      return { ...a, run: answerItem(a.run, itemId, ok) };
    });
    if (active && !isAnswered(active.run, itemId)) void recordExerciseAnswer(lesson, itemId, ok);
  };

  /** Moves the run on; when a full run (not a retry) ends, its score and active time are recorded. */
  const advance = (next: Run) => {
    if (!active) return;
    if (isFinished(next) && !isFinished(active.run) && !next.retry) {
      void recordExerciseSet(lesson, active.set.id, score(next), next.queue.length);
      void logActivity(lesson, 'exercise-set', active.set.id, timer.elapsed(), next.queue.length);
    }
    setActive({ ...active, run: next });
  };

  if (!active) {
    return (
      <article className="step exercises">
        <header>
          <p className="eyebrow">Lesson {lesson.lesson}</p>
          <h1 ref={listHeadingRef} tabIndex={-1} className="ex-title">
            Exercises
          </h1>
        </header>
        {lesson.exercises.length === 0 && <p className="muted">This lesson has no exercises.</p>}
        <ul className="ex-sets">
          {lesson.exercises.map((set) => {
            const last = progress.exerciseSets[set.id];
            return (
              <li key={set.id} className="ex-set">
                <div className="ex-set-text">
                  <h2 className="ex-set-title">
                    <span className="ex-set-label">{setLabel(set)}</span> {set.title}
                  </h2>
                  <p className="ex-set-meta muted">
                    {TYPE_LABELS[set.type]} · {set.items.length} items
                  </p>
                  <p className="ex-set-score">
                    {last ? (
                      <>
                        <span aria-hidden="true">✓ </span>Last score {last.score} / {last.total}
                      </>
                    ) : (
                      <span className="muted">Not done yet</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  className={`button ${last ? 'button-quiet' : ''}`}
                  aria-label={`${last ? 'Do again' : 'Start'}: ${setLabel(set)}, ${set.title}`}
                  onClick={() => begin(set, set.items.map((i) => i.id), false)}
                >
                  {last ? 'Do again' : 'Start'}
                </button>
              </li>
            );
          })}
        </ul>
      </article>
    );
  }

  const { set, run, n } = active;
  const itemId = currentItem(run);

  return (
    <article className="step exercises">
      <header className="ex-run-header">
        <button type="button" className="button button-quiet" onClick={backToSets}>
          <span aria-hidden="true">‹</span> All sets
        </button>
        <p className="eyebrow ex-run-title">
          {setLabel(set)} · {set.title}
          {run.retry && ' · retry'}
        </p>
      </header>

      {finished ? (
        <RunSummary set={set} run={run} headingRef={headingRef} onRetry={() => begin(set, wrongIds(run), true)} onBack={backToSets} />
      ) : set.type === 'match' ? (
        <>
          <h2 className="ex-position" ref={headingRef} tabIndex={-1}>
            Match {run.queue.length} {run.queue.length === 1 ? 'word' : 'words'}
          </h2>
          <MatchBoard
            key={n}
            items={set.items.filter((i) => run.queue.includes(i.id))}
            seed={`${set.id}:${nonce}:${n}`}
            onMatch={onAnswer}
            onFinish={() => advance(finishRun(run))}
          />
        </>
      ) : itemId ? (
        <>
          <h2 className="ex-position" ref={headingRef} tabIndex={-1}>
            {positionLabel(run)}
          </h2>
          <CurrentItem key={`${n}:${itemId}`} set={set} itemId={itemId} seed={`${itemId}:${nonce}:${n}`} onAnswer={onAnswer} />
          {isAnswered(run, itemId) && (
            <div className="ex-actions ex-next">
              <button type="button" className="button" onClick={() => advance(nextItem(run))}>
                {run.index + 1 < run.queue.length ? 'Next' : 'See score'} <span aria-hidden="true">›</span>
              </button>
            </div>
          )}
        </>
      ) : null}
    </article>
  );
}

function CurrentItem({ set, itemId, seed, onAnswer }: { set: ExerciseSet; itemId: string; seed: string; onAnswer: (id: string, ok: boolean) => void }) {
  const answer = (ok: boolean) => onAnswer(itemId, ok);
  switch (set.type) {
    case 'choice': {
      const item = set.items.find((i) => i.id === itemId);
      return item ? <ChoiceItem item={item} seed={seed} onAnswer={answer} /> : null;
    }
    case 'order': {
      const item = set.items.find((i) => i.id === itemId);
      return item ? <OrderItem item={item} seed={seed} onAnswer={answer} /> : null;
    }
    case 'translate': {
      const item = set.items.find((i) => i.id === itemId);
      return item ? <TranslateItem item={item} onAnswer={answer} /> : null;
    }
    default:
      return null;
  }
}

/** The model answer of an item, for the list of misses. */
function answerOf(set: ExerciseSet, id: string): { zh: string; en?: string } | null {
  switch (set.type) {
    case 'choice': {
      const it = set.items.find((i) => i.id === id);
      return it ? { zh: it.prompt.replace('___', it.answer) } : null;
    }
    case 'order': {
      const it = set.items.find((i) => i.id === id);
      return it ? { zh: it.answer } : null;
    }
    case 'translate': {
      const it = set.items.find((i) => i.id === id);
      return it ? { zh: it.answer, en: it.en } : null;
    }
    case 'match': {
      const it = set.items.find((i) => i.id === id);
      return it ? { zh: it.zh, en: it.en } : null;
    }
  }
}

function RunSummary({
  set,
  run,
  headingRef,
  onRetry,
  onBack,
}: {
  set: ExerciseSet;
  run: Run;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRetry: () => void;
  onBack: () => void;
}) {
  const wrong = wrongIds(run);
  const message =
    wrong.length === 0
      ? run.retry
        ? 'All the missed ones are right now.'
        : 'Every item right. Your score is saved.'
      : run.retry
        ? 'A retry does not change the set’s saved score. Still to work on:'
        : 'Your score is saved. The ones you missed:';
  return (
    <section className="ex-summary">
      <h2 className="ex-score" ref={headingRef} tabIndex={-1}>
        <span aria-hidden="true">{wrong.length === 0 ? '✓ ' : ''}</span>
        {score(run)} of {run.queue.length} right
      </h2>
      <p className="muted">{message}</p>
      {wrong.length > 0 && (
        <ul className="ex-missed">
          {wrong.map((id) => {
            const a = answerOf(set, id);
            if (!a) return null;
            return (
              <li key={id}>
                <span className="ex-mark" aria-hidden="true">
                  ✗
                </span>
                <span className="ex-missed-text">
                  <span lang="zh-Hans" className="ex-missed-zh">
                    {a.zh}
                  </span>
                  {a.en && <span className="ex-missed-en">{a.en}</span>}
                </span>
                <SpeakButton text={a.zh} />
              </li>
            );
          })}
        </ul>
      )}
      <div className="ex-actions">
        {wrong.length > 0 && (
          <button type="button" className="button" onClick={onRetry}>
            Retry the wrong ones ({wrong.length})
          </button>
        )}
        <button type="button" className={`button ${wrong.length > 0 ? 'button-quiet' : ''}`} onClick={onBack}>
          Back to sets
        </button>
      </div>
    </section>
  );
}
