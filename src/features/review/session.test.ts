import { describe, expect, it } from 'vitest';
import { addDays } from '../../lib/days.ts';
import { addCards, gradeCard, type ReviewCards } from '../../lib/review.ts';
import { answerCard, currentKey, describeDay, isSessionDone, nextReview, sessionCounts, splitLessonKey, startSession } from './session.ts';

const D0 = '2026-11-16';
const opts = { newCardsPerDay: 20, sessionCap: 40 };

describe('review session', () => {
  it('grades only first answers and shows an "Again" card once more at the end', () => {
    let s = startSession(['a', 'b', 'c']);
    const grades: unknown[] = [];
    const step = (gotIt: boolean) => {
      const r = answerCard(s, gotIt);
      s = r.session;
      grades.push(r.grade);
    };
    step(false); // a: again → back of the queue
    expect(s.queue).toEqual(['b', 'c', 'a']);
    step(true); // b
    step(false); // c: again
    expect(s.queue).toEqual(['a', 'c']);
    step(false); // a again: not graded, not repeated a third time
    step(true); // c
    expect(isSessionDone(s)).toBe(true);
    expect(currentKey(s)).toBeNull();
    expect(grades).toEqual([{ key: 'a', gotIt: false }, { key: 'b', gotIt: true }, { key: 'c', gotIt: false }, null, null]);
    expect(sessionCounts(s)).toEqual({ reviewed: 3, gotFirstTime: 1, neededAgain: 2, left: 0, progress: 1 });
  });

  it('counts progress including the repeats', () => {
    let s = startSession(['a', 'b']);
    s = answerCard(s, false).session;
    expect(sessionCounts(s)).toMatchObject({ left: 2, progress: 1 / 3 });
    expect(answerCard(startSession([]), true).grade).toBeNull();
  });

  it('finds the next review day and its size', () => {
    let cards: ReviewCards = addCards({}, '2/L11', ['L11.v.1', 'L11.v.2'], D0);
    expect(nextReview({}, D0, opts)).toBeNull();
    expect(nextReview(cards, D0, opts)).toEqual({ day: addDays(D0, 1), count: 2 });
    const d1 = addDays(D0, 1);
    cards = { ...cards, '2/L11.v.1': gradeCard(cards['2/L11.v.1'], true, d1), '2/L11.v.2': gradeCard(cards['2/L11.v.2'], false, d1) };
    expect(nextReview(cards, d1, opts)).toEqual({ day: addDays(d1, 1), count: 1 });
  });

  it('puts cards held back by the daily new-card limit on the next day', () => {
    const cards = addCards({}, '2/L11', ['L11.v.1', 'L11.v.2', 'L11.v.3'], addDays(D0, -3));
    expect(nextReview(cards, D0, { newCardsPerDay: 2, sessionCap: 40 })).toEqual({ day: addDays(D0, 1), count: 2 });
    expect(nextReview(cards, D0, { newCardsPerDay: 0, sessionCap: 40 })).toBeNull();
  });

  it('describes days and splits lesson keys', () => {
    expect(describeDay(D0, D0)).toBe('today');
    expect(describeDay(addDays(D0, 1), D0)).toBe('tomorrow');
    expect(describeDay('2026-11-20', D0)).toBe('Fri 20 Nov');
    expect(splitLessonKey('2/L11')).toEqual({ level: 2, id: 'L11' });
    expect(splitLessonKey('nope')).toBeNull();
  });
});
