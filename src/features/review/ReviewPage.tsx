import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { todayDay, type Day } from '../../lib/days.ts';
import { loadMyWords, useMyWords, type MyWord } from '../../lib/mywords.ts';
import { logActivity } from '../../lib/progress.ts';
import { cardKey, dueToday, gradeCard, loadReviewCards, updateReviewCards, useReviewCards, type ReviewCard, type ReviewCards } from '../../lib/review.ts';
import { ensureReviewSynced } from '../../lib/reviewSync.ts';
import { getSettings, loadSettings, useSettings } from '../../lib/settings.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { ReviewCardView } from './ReviewCardView.tsx';
import { findReviewWord } from './reviewWord.ts';
import { answerCard, currentKey, describeDay, isSessionDone, nextReview, sessionCounts, startSession, type Session } from './session.ts';
import '../vocab/vocab.css';
import './review.css';

type MyWords = Record<string, MyWord>;

/** Due cards whose word still exists: lesson words in the content, my own words in `mywords`. */
const playable = (cards: ReviewCards, today: Day, mine: MyWords) => dueToday(cards, today, getSettings()).filter((c: ReviewCard) => findReviewWord(c, mine));

/** Today's session, fixed at the start. Own cards share the schedule and the daily new-card limit. */
const sessionFor = (cards: ReviewCards, today: Day, mine: MyWords): Session =>
  startSession(playable(cards, today, mine).map((c) => cardKey(c.lesson, c.id)));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function NextReview({ cards, today }: { cards: ReviewCards; today: Day }) {
  const settings = useSettings();
  const next = nextReview(cards, today, settings);
  if (!next) return null;
  return (
    <p>
      Next review: <strong>{describeDay(next.day, today)}</strong>, {plural(next.count, 'card', 'cards')}.
    </p>
  );
}

/** Vocabulary review (PLAN.md 5.3): today's due cards, one at a time; every answer is saved at once. */
export function ReviewPage() {
  const { cards } = useReviewCards();
  const { words: mine } = useMyWords();
  useSettings(); // re-render when settings load or change
  const timer = useActiveTimer();
  const [today] = useState(todayDay);
  const [session, setSession] = useState<Session | null>(null);
  const [failed, setFailed] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);

  const begin = (next: Session) => {
    sessionRef.current = next;
    setSession(next);
    timer.reset();
  };

  useEffect(() => {
    let cancelled = false;
    // If my words cannot be read, their cards are left out today (never lost).
    const myWords = loadMyWords().catch((err): MyWords => {
      console.warn('Could not load my words', err);
      return {};
    });
    Promise.all([ensureReviewSynced(), loadSettings(), myWords])
      .then(([, , words]) => loadReviewCards().then((saved) => ({ saved, words })))
      .then(
        ({ saved, words }) => {
          if (!cancelled && !sessionRef.current) begin(sessionFor(saved, today, words));
        },
        (err) => {
          console.warn('Could not load review cards', err);
          if (!cancelled) setFailed(true);
        },
      );
    return () => {
      cancelled = true;
    };
    // Once per visit: the session is fixed when it starts.
  }, []);

  const done = session !== null && session.answers > 0 && isSessionDone(session);
  useEffect(() => {
    if (done) doneHeading.current?.focus();
  }, [done]);

  function answer(gotIt: boolean) {
    const before = sessionRef.current;
    if (!before || isSessionDone(before)) return;
    const { session: next, grade } = answerCard(before, gotIt);
    sessionRef.current = next;
    setSession(next);
    if (grade) {
      void updateReviewCards((all) => {
        const card = all[grade.key];
        return card ? { ...all, [grade.key]: gradeCard(card, grade.gotIt, today) } : all;
      });
    }
    if (isSessionDone(next)) {
      void logActivity({ level: 0, id: 'review' }, 'review', `review.${new Date().toISOString()}`, timer.elapsed(), sessionCounts(next).reviewed);
    }
  }

  const header = (
    <header className="review-header">
      <p className="review-eyebrow muted">Vocabulary</p>
      <h1>Review</h1>
    </header>
  );

  if (failed) {
    return (
      <div className="page review">
        {header}
        <p role="alert" className="review-panel">
          Your review cards could not be read from this device's storage. Close the app and open it again.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page review" aria-busy="true">
        {header}
      </div>
    );
  }

  // ---- nothing due ----
  if (session.answers === 0 && isSessionDone(session)) {
    const hasCards = Object.keys(cards).length > 0;
    return (
      <div className="page review">
        {header}
        <section className="review-panel" aria-labelledby="review-empty-heading">
          <h2 id="review-empty-heading">Nothing to review today</h2>
          {hasCards ? (
            <NextReview cards={cards} today={today} />
          ) : (
            <p>Words join review when you finish a vocabulary part's flashcards, and come up the next day.</p>
          )}
          <div className="review-panel-actions">
            <Link to="/" className="button">
              Back to lessons
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ---- finished ----
  if (done) {
    const counts = sessionCounts(session);
    const moreToday = playable(cards, today, mine).length;
    return (
      <div className="page review">
        {header}
        <section className="review-panel" aria-labelledby="review-done-heading">
          <h2 id="review-done-heading" className="review-done-heading" ref={doneHeading} tabIndex={-1}>
            <span aria-hidden="true">✓ </span>Review done
          </h2>
          <p className="muted">{plural(counts.reviewed, 'card', 'cards')} reviewed</p>
          <dl className="review-counts">
            <div>
              <dt>Got it first time</dt>
              <dd>{counts.gotFirstTime}</dd>
            </div>
            <div>
              <dt>Needed again</dt>
              <dd>{counts.neededAgain}</dd>
            </div>
          </dl>
          {moreToday > 0 ? <p>{plural(moreToday, 'more card is', 'more cards are')} due today.</p> : <NextReview cards={cards} today={today} />}
          <div className="review-panel-actions">
            {moreToday > 0 && (
              <button type="button" className="button" onClick={() => begin(sessionFor(cards, today, mine))}>
                Keep going
              </button>
            )}
            <Link to="/" className={moreToday > 0 ? 'button button-quiet' : 'button'}>
              Back to lessons
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // ---- a card ----
  const key = currentKey(session)!;
  const card = cards[key];
  const found = card ? findReviewWord(card, mine) : null;
  const counts = sessionCounts(session);

  return (
    <div className="page review">
      {header}
      <section className="flashcards review-session" aria-label="Review cards">
        <div className="fc-toolbar">
          <p className="fc-left" aria-live="polite">
            <strong>{counts.left}</strong> left
          </p>
          <p className="muted review-tally">
            {counts.gotFirstTime} got it · {counts.neededAgain} again
          </p>
        </div>
        <div
          className="fc-progress"
          role="progressbar"
          aria-label="Session progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(counts.progress * 100)}
        >
          <span style={{ width: `${counts.progress * 100}%` }} />
        </div>
        {found ? (
          <ReviewCardView key={`${key}-${session.answers}`} word={found} onAnswer={answer} />
        ) : (
          <div className="review-panel">
            <p>This card is no longer in your review.</p>
            <button type="button" className="button" onClick={() => answer(true)}>
              Skip
            </button>
          </div>
        )}
        <p className="fc-help muted">Swipe right for Got it, left for Again. “Again” cards come back once at the end.</p>
      </section>
    </div>
  );
}
