import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import type { Lesson, VocabItem } from '../../lib/content/types.ts';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { isDrag, swipeProgress, swipeResult } from '../vocab/swipe.ts';

type Answer = 'got-it' | 'again';

/** How long a swiped card takes to fly off (matches the CSS transition). */
const FLY_MS = 180;
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One review card: Chinese on the front; tap to flip for pinyin, English, a speak button and the
 * lesson it came from. "Again" / "Got it" by button, swipe (left / right) or arrow keys.
 * Remount it (key) for each card shown.
 */
export function ReviewCardView({ word, lesson, onAnswer }: { word: VocabItem; lesson: Lesson; onAnswer: (gotIt: boolean) => void }) {
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<Answer | null>(null);
  const press = useRef<{ id: number; x: number; y: number; drag: boolean } | null>(null);
  const cardWidth = useRef(400);
  /** A drag ends with a click on some browsers; that click must not flip the card. */
  const ignoreClickUntil = useRef(0);
  const flyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const answered = useRef(false);

  useEffect(() => () => clearTimeout(flyTimer.current), []);

  function decide(kind: Answer) {
    if (answered.current) return;
    answered.current = true;
    if (reducedMotion()) return onAnswer(kind === 'got-it');
    setLeaving(kind);
    flyTimer.current = setTimeout(() => onAnswer(kind === 'got-it'), FLY_MS);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (leaving || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if ((e.target as Element).closest('.speak-button')) return;
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
      if (Math.abs(dy) > Math.abs(dx)) {
        press.current = null; // mostly vertical: the page scrolls
        return;
      }
      p.drag = true;
      setDragging(true);
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

  const flyX = leaving === 'got-it' ? 1 : leaving === 'again' ? -1 : 0;
  const tint = leaving ? 1 : swipeProgress(dragX, cardWidth.current);
  const cardStyle = {
    transform: `translateX(${leaving ? `${flyX * 130}%` : `${dragX}px`}) rotate(${leaving ? flyX * 12 : dragX / 20}deg)`,
    '--fc-got': dragX > 0 || leaving === 'got-it' ? tint : 0,
    '--fc-again': dragX < 0 || leaving === 'again' ? tint : 0,
  } as CSSProperties;
  const long = word.zh.length > 4;

  return (
    <>
      <div className="fc-stage">
        <div
          className="fc-card review-card"
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
            <span lang="zh-Hans" className="fc-zh" data-long={long || undefined}>
              {word.zh}
            </span>
            {flipped ? (
              <span className="fc-back">
                <span className="fc-pinyin pinyin">{word.pinyin}</span>
                <span className="fc-en">
                  <span className="fc-pos">{word.pos}</span>
                  {word.en}
                </span>
                <span className="review-source muted">
                  Lesson {lesson.lesson} ·{' '}
                  <span lang="zh-Hans" className="review-source-zh">
                    {lesson.titleZh}
                  </span>
                </span>
              </span>
            ) : (
              <span className="fc-hint muted">Tap to flip</span>
            )}
          </button>
          {flipped && (
            <span className="fc-speak">
              <SpeakButton text={word.zh} label={`Hear ${word.zh}`} />
            </span>
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
    </>
  );
}
