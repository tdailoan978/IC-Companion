import { describe, expect, it } from 'vitest';
import type { VocabItem } from '../../lib/content/types.ts';
import { again, createDeck, gotIt } from './deck.ts';
import { fromSavedDeck, savedDeckKey, toSavedDeck } from './savedDeck.ts';

const word = (n: number): VocabItem => ({ id: `L11.v.${n}`, part: 1, n, zh: `字${n}`, pinyin: 'zì', pos: 'n', en: `word ${n}` });
const words = [1, 2, 3, 4].map(word);

describe('saved flashcard deck', () => {
  it('is keyed per lesson and part', () => {
    expect(savedDeckKey({ level: 2, id: 'L11' }, 1)).toBe('deck.2/L11.p1');
  });

  it('round-trips the queue order, learned cards, agains and time', () => {
    const deck = again(gotIt(createDeck(words)));
    const saved = toSavedDeck(deck, 1234.4);
    expect(saved).toEqual({ queue: ['L11.v.3', 'L11.v.4', 'L11.v.2'], learned: ['L11.v.1'], agains: 1, ms: 1234 });
    expect(fromSavedDeck(JSON.parse(JSON.stringify(saved)), words)).toEqual({ deck, ms: 1234 });
  });

  it('drops unknown ids and adds new words at the back', () => {
    const restored = fromSavedDeck({ queue: ['L11.v.9', 'L11.v.2'], learned: ['L11.v.1'], agains: 0, ms: 0 }, words);
    expect(restored?.deck.queue.map((w) => w.id)).toEqual(['L11.v.2', 'L11.v.3', 'L11.v.4']);
    expect(restored?.deck.learned.map((w) => w.id)).toEqual(['L11.v.1']);
  });

  it('has nothing to resume for a missing, malformed or finished save', () => {
    expect(fromSavedDeck(null, words)).toBeNull();
    expect(fromSavedDeck({ queue: 'x' }, words)).toBeNull();
    expect(fromSavedDeck(toSavedDeck({ queue: [], learned: words, agains: 0 }, 0), words)).toBeNull();
  });
});
