// Flashcard deck for one vocabulary part (PLAN.md 5.2 step 2). Pure, so the
// screen only holds a Deck in state and swaps it for the next one.
// - "Got it" takes the front card out of the deck.
// - "Again" puts the front card back at the end.
// - The run is finished when every card has been "Got it".

export type Deck<T> = {
  /** Cards still to learn; the first one is on screen. */
  queue: T[];
  /** Cards marked "Got it", in the order they were learned. */
  learned: T[];
  /** How many times "Again" was pressed in this run. */
  agains: number;
};

export function createDeck<T>(cards: readonly T[], options: { shuffle?: boolean; random?: () => number } = {}): Deck<T> {
  const queue = options.shuffle ? shuffled(cards, options.random) : [...cards];
  return { queue, learned: [], agains: 0 };
}

export const currentCard = <T>(deck: Deck<T>): T | null => deck.queue[0] ?? null;
export const cardsLeft = (deck: Deck<unknown>) => deck.queue.length;
export const isFinished = (deck: Deck<unknown>) => deck.queue.length === 0;
export const deckSize = (deck: Deck<unknown>) => deck.queue.length + deck.learned.length;

export function gotIt<T>(deck: Deck<T>): Deck<T> {
  if (isFinished(deck)) return deck;
  const [card, ...rest] = deck.queue;
  return { ...deck, queue: rest, learned: [...deck.learned, card] };
}

export function again<T>(deck: Deck<T>): Deck<T> {
  if (isFinished(deck)) return deck;
  const [card, ...rest] = deck.queue;
  return { ...deck, queue: [...rest, card], agains: deck.agains + 1 };
}

/** Re-orders the cards still to learn (shuffle on, or back to book order) without losing progress. */
export function reorderQueue<T>(deck: Deck<T>, order: (cards: readonly T[]) => T[]): Deck<T> {
  return { ...deck, queue: order(deck.queue) };
}

/** Fisher-Yates; `random` is injectable for tests. */
export function shuffled<T>(cards: readonly T[], random: () => number = Math.random): T[] {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
