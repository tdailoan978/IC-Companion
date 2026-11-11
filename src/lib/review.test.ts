import { describe, expect, it } from 'vitest';
import { addCards, dueToday, gradeCard, type ReviewCards } from './review.ts';
import { addDays } from './days.ts';

const D0 = '2026-11-16'; // a Monday
const opts = { newCardsPerDay: 20, sessionCap: 40 };

describe('Leitner review', () => {
  it('adds learned words for review the next day, and never resets existing cards', () => {
    let cards = addCards({}, '2/L11', ['L11.v.1', 'L11.v.2'], D0);
    expect(dueToday(cards, D0, opts)).toHaveLength(0);
    expect(dueToday(cards, addDays(D0, 1), opts).map((c) => c.id)).toEqual(['L11.v.1', 'L11.v.2']);
    cards = { ...cards, '2/L11.v.1': gradeCard(cards['2/L11.v.1'], true, addDays(D0, 1)) };
    const again = addCards(cards, '2/L11', ['L11.v.1'], addDays(D0, 5));
    expect(again['2/L11.v.1'].box).toBe(2);
  });

  it('follows the intervals 1, 2, 4, 8, 16 days with a fake clock', () => {
    let card = addCards({}, '2/L11', ['L11.v.1'], D0)['2/L11.v.1'];
    let day = card.due;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      card = gradeCard(card, true, day);
      const next = card.due;
      gaps.push(Math.round((new Date(next).getTime() - new Date(day).getTime()) / 86_400_000));
      day = next;
    }
    expect(gaps).toEqual([2, 4, 8, 16, 16, 16]);
    expect(card.box).toBe(5);
  });

  it('sends a missed card back to box 1, due the next day', () => {
    const card = { ...addCards({}, '2/L11', ['L11.v.1'], D0)['2/L11.v.1'], box: 4 as const };
    const after = gradeCard(card, false, '2026-12-01');
    expect(after.box).toBe(1);
    expect(after.due).toBe('2026-12-02');
  });

  it('shows reviewed cards oldest-due first, then new ones within the daily allowance and the session cap', () => {
    let cards: ReviewCards = addCards({}, '2/L11', Array.from({ length: 30 }, (_, i) => `L11.v.${i + 1}`), D0);
    const day1 = addDays(D0, 1);
    expect(dueToday(cards, day1, opts)).toHaveLength(20);
    // Review 20 new cards on day 1 (all "Again" so they come back on day 2).
    for (const c of dueToday(cards, day1, opts)) cards = { ...cards, [`2/${c.id}`]: gradeCard(c, false, day1) };
    expect(dueToday(cards, day1, opts)).toHaveLength(0); // allowance used up today
    const day2 = addDays(D0, 2);
    const session = dueToday(cards, day2, { newCardsPerDay: 20, sessionCap: 25 });
    expect(session).toHaveLength(25);
    expect(session.slice(0, 20).every((c) => c.firstReviewed)).toBe(true);
    expect(session.slice(20).every((c) => !c.firstReviewed)).toBe(true);
  });
});
