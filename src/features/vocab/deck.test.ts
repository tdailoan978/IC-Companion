import { describe, expect, it } from 'vitest';
import { again, cardsLeft, createDeck, currentCard, deckSize, gotIt, isFinished, reorderQueue, shuffled } from './deck.ts';

describe('flashcard deck', () => {
  it('starts with every card in book order', () => {
    const deck = createDeck(['a', 'b', 'c']);
    expect(currentCard(deck)).toBe('a');
    expect(cardsLeft(deck)).toBe(3);
    expect(isFinished(deck)).toBe(false);
  });

  it('"Got it" removes the front card', () => {
    const deck = gotIt(createDeck(['a', 'b', 'c']));
    expect(deck.queue).toEqual(['b', 'c']);
    expect(deck.learned).toEqual(['a']);
    expect(deckSize(deck)).toBe(3);
  });

  it('"Again" puts the front card at the end', () => {
    const deck = again(createDeck(['a', 'b', 'c']));
    expect(deck.queue).toEqual(['b', 'c', 'a']);
    expect(deck.agains).toBe(1);
    expect(cardsLeft(deck)).toBe(3);
  });

  it('finishes only when every card has been "Got it"', () => {
    let deck = createDeck(['a', 'b']);
    deck = again(deck); // b, a
    deck = gotIt(deck); // a
    expect(isFinished(deck)).toBe(false);
    deck = again(deck); // a (the last card comes straight back)
    expect(currentCard(deck)).toBe('a');
    deck = gotIt(deck);
    expect(isFinished(deck)).toBe(true);
    expect(currentCard(deck)).toBeNull();
    expect(deck.learned).toEqual(['b', 'a']);
  });

  it('ignores answers once finished', () => {
    const done = gotIt(createDeck(['a']));
    expect(gotIt(done)).toBe(done);
    expect(again(done)).toBe(done);
  });

  it('does not change the cards it was given', () => {
    const cards = ['a', 'b', 'c'];
    gotIt(again(createDeck(cards, { shuffle: true })));
    expect(cards).toEqual(['a', 'b', 'c']);
  });

  it('shuffles every card exactly once', () => {
    const cards = Array.from({ length: 20 }, (_, i) => i);
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const deck = createDeck(cards, { shuffle: true, random });
    expect(deck.queue).not.toEqual(cards);
    expect([...deck.queue].sort((a, b) => a - b)).toEqual(cards);
  });

  it('shuffle with random() = 0 is a fixed rotation', () => {
    expect(shuffled([1, 2, 3], () => 0)).toEqual([2, 3, 1]);
  });

  it('re-orders the remaining cards without losing progress', () => {
    let deck = gotIt(createDeck([3, 1, 2, 4]));
    deck = reorderQueue(deck, (q) => [...q].sort((a, b) => a - b));
    expect(deck.queue).toEqual([1, 2, 4]);
    expect(deck.learned).toEqual([3]);
  });
});
