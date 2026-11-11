import { useEffect } from 'react';
import { Link } from 'react-router';
import { todayDay } from '../../lib/days.ts';
import { dueToday, useReviewCards } from '../../lib/review.ts';
import { ensureReviewSynced } from '../../lib/reviewSync.ts';
import { useSettings } from '../../lib/settings.ts';
import './review-due.css';

/** Home: "Review due: N", shown only while vocabulary cards are due today. */
export function ReviewDueButton() {
  const { cards, loaded } = useReviewCards();
  const settings = useSettings();

  useEffect(() => {
    void ensureReviewSynced();
  }, []);

  const due = loaded ? dueToday(cards, todayDay(), settings).length : 0;
  if (due === 0) return null;

  return (
    <Link to="/review" className="button review-due-button">
      <span className="review-due-kicker">Vocabulary</span>
      <span>
        Review due: <strong className="review-due-count">{due}</strong>
      </span>
    </Link>
  );
}
