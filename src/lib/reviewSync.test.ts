import { describe, expect, it } from 'vitest';
import { findLesson } from './content/lessons.ts';
import { toDay } from './days.ts';
import { emptyProgress } from './progress.ts';
import { addCards } from './review.ts';
import { addMissingCards, missingReviewCards } from './reviewSync.ts';

const L11 = findLesson(2, 'L11')!;
const part1 = L11.vocab.filter((v) => v.part === 1).map((v) => v.id);
const part2 = L11.vocab.filter((v) => v.part === 2).map((v) => v.id);
const T = '2026-11-12T09:30:00.000Z';

describe('review sync from lesson progress', () => {
  it('adds nothing for unfinished parts', () => {
    expect(missingReviewCards(L11, emptyProgress(), {})).toEqual([]);
  });

  it('lists the words of a finished part that have no card, learned on that local day', () => {
    const p = { ...emptyProgress(), vocabParts: { '1': T } };
    expect(missingReviewCards(L11, p, {})).toEqual([{ lesson: '2/L11', ids: part1, learnedOn: toDay(new Date(T)) }]);
  });

  it('skips words that already have cards, and parts that are fully carded', () => {
    const p = { ...emptyProgress(), vocabParts: { '1': T, '2': T } };
    let cards = addCards({}, '2/L11', part1, '2026-11-01');
    cards = addCards(cards, '2/L11', part2.slice(1), '2026-11-01');
    expect(missingReviewCards(L11, p, cards)).toEqual([{ lesson: '2/L11', ids: [part2[0]], learnedOn: toDay(new Date(T)) }]);
  });

  it('applies the missing cards without touching existing ones', () => {
    const p = { ...emptyProgress(), vocabParts: { '1': T } };
    const existing = addCards({}, '2/L11', [part1[0]], '2026-11-01');
    const next = addMissingCards(existing, missingReviewCards(L11, p, existing));
    expect(Object.keys(next)).toHaveLength(part1.length);
    expect(next[`2/${part1[0]}`].added).toBe('2026-11-01');
    expect(next[`2/${part1[1]}`].added).toBe(toDay(new Date(T)));
    expect(missingReviewCards(L11, p, next)).toEqual([]);
  });
});
