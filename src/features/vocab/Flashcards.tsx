import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { Lesson, VocabItem } from '../../lib/content/types.ts';
import { lessonKey } from '../../lib/content/types.ts';
import { todayDay } from '../../lib/days.ts';
import { getProgress, logActivity, markVocabPartDone, recordVocabGot } from '../../lib/progress.ts';
import { addCards, updateReviewCards } from '../../lib/review.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { ToggleChip } from '../../app/ToggleChip.tsx';
import { allGot, type WordSlice } from '../deeplink/links.ts';
import { NoteButton } from '../notes/NoteButton.tsx';
import { again, cardsLeft, createDeck, currentCard, deckSize, gotIt, isFinished, reorderQueue, shuffled, type Deck } from './deck.ts';
import { isDrag, swipeProgress, swipeResult } from './swipe.ts';
import { clearSavedDeck, fromSavedDeck, loadSavedDeck, saveDeck, toSavedDeck } from './savedDeck.ts';

type Part = 1 | 2;
type Answer = 'got-it' | 'again';

type Props = {
  lesson: Lesson;
  part: Part;
  words: VocabItem[];
  reverse: boolean;
  onReverse: (on: boolean) => void;
  shuffle: boolean;
  onShuffle: (on: boolean) => void;
  otherPart?: Part;
  onSwitchPart: (part: Part) => void;
  onShowList: () => void;
  /**
   * A study-plan word slice (?item=p1.s2): a run of only these words, kept in memory. It never reads
   * or writes the part's saved deck, so the whole-part flashcards keep their place.
   */
  slice?: WordSlice;
};

/** How long a swiped card takes to fly off (matches the CSS transition). */
const FLY_MS = 180;

const bookOrder = (cards: readonly VocabItem[]) => [...cards].sort((a, b) => a.n - b.n);
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Flashcards for one part. Mounting starts the part's run (and its active timer), or resumes the
 * saved one; every answer saves the place. Finishing records the part as done, adds its words to
 * review and logs how long it took for the study plan (PLAN.md 9.1).
 *
 * With `slice`: a run of the slice's words only, not saved. Every "Got it" is still recorded (the
 * plan ticks the slice when all its words are got); finishing adds the slice's words to review,
 * logs the time, and marks the part done once every word of the part has been got.
 */
export function Flashcards({ lesson, part, words, reverse, onReverse, shuffle, onShuffle, otherPart, onSwitchPart, onShowList, slice }: Props) {
  const timer = useActiveTimer();
  const [deck, setDeck] = useState<Deck<VocabItem>>(() => createDeck(words, { shuffle }));
  const deckRef = useRef(deck);
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Answer | null>(null);
  const press = useRef<{ id: number; x: number; y: number; drag: boolean } | null>(null);
  const cardWidth = useRef(400);
  /** A drag ends with a click on some browsers; that click must not flip the next card. */
  const ignoreClickUntil = useRef(0);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finishedHeading = useRef<HTMLHeadingElement>(null);
  /** Until the saved place has been read, the deck is not shown, so an answer cannot overwrite it. */
  const [ready, setReady] = useState(Boolean(slice));
  /** Active time from earlier sittings of a resumed run. */
  const priorMs = useRef(0);
  const elapsed = () => priorMs.current + timer.elapsed();

  useEffect(() => () => clearTimeout(flyTimer.current), []);

  useEffect(() => {
    if (slice) return; // a slice run starts fresh and is never saved
    let cancelled = false;
    loadSavedDeck(lesson, part).then((saved) => {
      if (cancelled) return;
      const restored = fromSavedDeck(saved, words);
      if (restored) {
        deckRef.current = restored.deck;
        setDeck(restored.deck);
        priorMs.current = restored.ms;
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // Only on mount: later changes to the deck are this component's own.
  }, []);

  const card = currentCard(deck);
  const finished = isFinished(deck);

  useEffect(() => {
    if (finished) finishedHeading.current?.focus();
  }, [finished]);

  const setDeckNow = (next: Deck<VocabItem>) => {
    deckRef.current = next;
    setDeck(next);
  };

  function answer(kind: Answer) {
    const before = deckRef.current;
    if (isFinished(before)) return;
    const next = kind === 'got-it' ? gotIt(before) : again(before);
    setDeckNow(next);
    setFlipped(false);
    setDragX(0);
    setLeaving(null);
    const got = kind === 'got-it' ? recordVocabGot(lesson, before.queue[0].id) : Promise.resolve();
    if (slice) {
      if (isFinished(next)) finishSlice(slice, got);
      return;
    }
    if (isFinished(next)) {
      void clearSavedDeck(lesson, part);
      void markVocabPartDone(lesson, part);
      const ids = words.map((w) => w.id);
      void updateReviewCards((cards) => addCards(cards, lessonKey(lesson), ids, todayDay()));
      void logActivity(lesson, 'vocab-part', `${lesson.id}.p${part}`, elapsed(), words.length);
    } else {
      void saveDeck(lesson, part, toSavedDeck(next, elapsed()));
    }
  }

  function finishSlice(s: WordSlice, lastGot: Promise<void>) {
    const ids = words.map((w) => w.id);
    void updateReviewCards((cards) => addCards(cards, lessonKey(lesson), ids, todayDay()));
    void logActivity(lesson, 'vocab-part', `${lesson.id}.${s.key}`, elapsed(), words.length);
    // The last slice of a part finishes the part, as the whole-part flashcards would.
    void lastGot.then(() => {
      const p = getProgress(lesson);
      const partIds = lesson.vocab.filter((v) => v.part === part).map((v) => v.id);
      if (p && !p.vocabParts[String(part) as '1' | '2'] && allGot(partIds, p.vocabGot)) void markVocabPartDone(lesson, part);
    });
  }

  /** Flies the card off to its side, then answers. Buttons and swipes both go through here. */
  function decide(kind: Answer) {
    if (leaving) return;
    if (reducedMotion()) return answer(kind);
    setLeaving(kind);
    flyTimer.current = setTimeout(() => answer(kind), FLY_MS);
  }

  function restart() {
    clearTimeout(flyTimer.current);
    setDeckNow(createDeck(words, { shuffle }));
    setFlipped(false);
    setDragX(0);
    setLeaving(null);
    timer.reset();
    priorMs.current = 0;
    if (!slice) void clearSavedDeck(lesson, part);
  }

  function toggleShuffle(on: boolean) {
    onShuffle(on);
    const next = reorderQueue(deckRef.current, on ? (q) => shuffled(q) : bookOrder);
    setDeckNow(next);
    setFlipped(false);
    if (!slice && !isFinished(next)) void saveDeck(lesson, part, toSavedDeck(next, elapsed()));
  }

  // ---- swipe (pointer events: touch, pen and mouse alike) ----

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (leaving || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('.speak-button, .note-button')) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, drag: false };
    cardWidth.current = e.currentTarget.getBoundingClientRect().width;
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.drag) {
      if (!isDrag(dx, dy)) return;
      // Mostly vertical: leave it to the page to scroll.
      if (Math.abs(dy) > Math.abs(dx)) {
        press.current = null;
        return;
      }
      p.drag = true;
      setDragging(true);
      // Capture only once it is a drag, so a plain tap still clicks the card and flips it.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDragX(dx);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || !p.drag) return; // a tap: the face's click flips it
    ignoreClickUntil.current = performance.now() + 400;
    setDragging(false);
    const result = swipeResult(e.clientX - p.x, e.clientY - p.y, cardWidth.current);
    if (result === 'got-it' || result === 'again') decide(result);
    else setDragX(0);
  }

  function onPointerCancel() {
    press.current = null;
    setDragging(false);
    setDragX(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') decide('got-it');
    else if (e.key === 'ArrowLeft') decide('again');
    else return;
    e.preventDefault();
  }

  function flip() {
    if (performance.now() < ignoreClickUntil.current) return;
    setFlipped((f) => !f);
  }

  if (finished && slice) {
    return (
      <section className="fc-finished" aria-labelledby="fc-finished-heading">
        <h2 id="fc-finished-heading" ref={finishedHeading} tabIndex={-1}>
          <span aria-hidden="true">✓ </span>
          {slice.label} done
        </h2>
        <p>Every word in this slice is learned. They join your review from tomorrow.</p>
        <p className="muted">
          {words.length} words{deck.agains > 0 ? ` · ${deck.agains} × again` : ''}
        </p>
        <div className="fc-finished-actions">
          <button type="button" className="button button-quiet" onClick={restart}>
            Go again
          </button>
          <button type="button" className="button button-quiet" onClick={onShowList}>
            Word list
          </button>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="fc-finished" aria-labelledby="fc-finished-heading">
        <h2 id="fc-finished-heading" ref={finishedHeading} tabIndex={-1}>
          <span aria-hidden="true">✓ </span>Part {part} done
        </h2>
        <p>These words join your review from tomorrow.</p>
        <p className="muted">
          {words.length} words{deck.agains > 0 ? ` · ${deck.agains} × again` : ''}
        </p>
        <div className="fc-finished-actions">
          {otherPart && (
            <button type="button" className="button" onClick={() => onSwitchPart(otherPart)}>
              Go to Part {otherPart}
            </button>
          )}
          <button type="button" className={`button ${otherPart ? 'button-quiet' : ''}`} onClick={restart}>
            Go again
          </button>
          <button type="button" className="button button-quiet" onClick={onShowList}>
            Word list
          </button>
        </div>
      </section>
    );
  }

  const runLabel = slice ? `${slice.label} flashcards` : `Part ${part} flashcards`;
  if (!ready) return <section className="flashcards" aria-busy="true" aria-label={runLabel} />;
  if (!card) return null;

  const left = cardsLeft(deck);
  const total = deckSize(deck);
  const flyX = leaving === 'got-it' ? 1 : leaving === 'again' ? -1 : 0;
  const shownX = leaving ? `${flyX * 130}%` : `${dragX}px`;
  const lean = leaving ? flyX * 12 : dragX / 20;
  const tint = leaving ? 1 : swipeProgress(dragX, cardWidth.current);
  const cardStyle = {
    transform: `translateX(${shownX}) rotate(${lean}deg)`,
    '--fc-got': dragX > 0 || leaving === 'got-it' ? tint : 0,
    '--fc-again': dragX < 0 || leaving === 'again' ? tint : 0,
  } as CSSProperties;
  const long = card.zh.length > 4;

  return (
    <section className="flashcards" aria-label={runLabel}>
      <div className="fc-toolbar">
        <p className="fc-left" aria-live="polite">
          <strong>{left}</strong> left
          <span className="muted"> of {total}</span>
        </p>
        <div className="toggle-row fc-toggles">
          <ToggleChip label="Reverse" on={reverse} onChange={(on) => {
              onReverse(on);
              setFlipped(false);
            }}
          />
          <ToggleChip label="Shuffle" on={shuffle} onChange={toggleShuffle} />
        </div>
      </div>
      <div className="fc-progress" aria-hidden="true">
        <span style={{ width: `${((total - left) / total) * 100}%` }} />
      </div>

      <div className="fc-stage">
        <div
          key={`${card.id}-${deck.learned.length}-${deck.agains}`}
          className="fc-card"
          data-dragging={dragging || undefined}
          data-flipped={flipped || undefined}
          style={cardStyle}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
        >
          <span className="fc-stamp fc-stamp-got" aria-hidden="true">
            Got it
          </span>
          <span className="fc-stamp fc-stamp-again" aria-hidden="true">
            Again
          </span>
          <button type="button" className="fc-face" aria-expanded={flipped} onClick={flip}>
            {reverse ? (
              <span className="fc-en-front">
                <span className="fc-pos">{card.pos}</span>
                {card.en}
              </span>
            ) : (
              <span lang="zh-Hans" className="fc-zh" data-long={long || undefined}>
                {card.zh}
              </span>
            )}
            {flipped ? (
              <span className="fc-back">
                {reverse && (
                  <span lang="zh-Hans" className="fc-zh fc-zh-back" data-long={long || undefined}>
                    {card.zh}
                  </span>
                )}
                <span className="fc-pinyin pinyin">{card.pinyin}</span>
                {!reverse && (
                  <span className="fc-en">
                    <span className="fc-pos">{card.pos}</span>
                    {card.en}
                  </span>
                )}
              </span>
            ) : (
              <span className="fc-hint muted">Tap to flip</span>
            )}
          </button>
          {flipped && (
            <>
              <span className="fc-speak">
                <SpeakButton text={card.zh} label={`Hear ${card.zh}`} />
              </span>
              <span className="fc-note">
                <NoteButton note={{ level: lesson.level, lessonId: lesson.id, kind: 'vocab', ref: card.id }} label={card.zh} compact />
              </span>
            </>
          )}
        </div>
      </div>

      <div className="fc-actions">
        <button type="button" className="button fc-again" onClick={() => decide('again')}>
          <span aria-hidden="true">←</span> Again
        </button>
        <button type="button" className="button fc-got" onClick={() => decide('got-it')}>
          Got it <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="fc-help muted">Swipe right for Got it, left for Again. “Again” puts the card at the back.</p>
    </section>
  );
}
