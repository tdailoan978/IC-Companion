import { describe, expect, it } from 'vitest';
import { addDays } from '../../lib/days.ts';
import type { MyWord } from '../../lib/mywords.ts';
import { addCards, cardKey, dueToday, gradeCard } from '../../lib/review.ts';
import { findReviewWord } from './reviewWord.ts';

const D0 = '2026-11-16';
const mine: Record<string, MyWord> = {
  'my.a': { id: 'my.a', zh: '雪人', pinyin: 'xuěrén', en: 'snowman', level: 2, lessonId: 'L11', noteKey: 'note.2/L11|grammar|L11.g.3', created: '2026-11-15T09:00:00.000Z' },
};

describe('own review cards', () => {
  it('takes an own card’s word from my words, and a lesson card’s from the lesson', () => {
    const cards = addCards(addCards({}, '2/L11', ['my.a', 'my.gone'], D0), '2/L11', ['L11.v.1'], D0);
    const own = findReviewWord(cards[cardKey('2/L11', 'my.a')], mine);
    expect(own).toMatchObject({ zh: '雪人', pinyin: 'xuěrén', en: 'snowman', mine: mine['my.a'] });
    expect(own?.lesson?.titleZh).toBe('天气');
    expect(findReviewWord(cards[cardKey('2/L11', 'L11.v.1')], mine)).toMatchObject({ zh: '天气', pos: 'n' });
    // A deleted word: skipped, not a crash.
    expect(findReviewWord(cards[cardKey('2/L11', 'my.gone')], mine)).toBeNull();
    expect(findReviewWord({ ...cards[cardKey('2/L11', 'L11.v.1')], id: 'L11.v.999' }, mine)).toBeNull();
  });

  it('follows the same schedule and shares the daily new-card limit', () => {
    const cards = addCards(addCards({}, '2/L11', ['L11.v.1', 'L11.v.2'], D0), '2/L11', ['my.a'], D0);
    const d1 = addDays(D0, 1);
    expect(dueToday(cards, D0, { newCardsPerDay: 20, sessionCap: 40 })).toHaveLength(0);
    const due = dueToday(cards, d1, { newCardsPerDay: 2, sessionCap: 40 });
    expect(due).toHaveLength(2);
    const all = dueToday(cards, d1, { newCardsPerDay: 20, sessionCap: 40 }).map((c) => c.id);
    expect(all).toContain('my.a');
    const graded = gradeCard(cards[cardKey('2/L11', 'my.a')], true, d1);
    expect(graded).toMatchObject({ box: 2, due: addDays(d1, 2) });
  });
});
