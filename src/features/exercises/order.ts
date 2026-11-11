// The word-order exercise: tiles, moves and the check.

import { normalizeForCompare } from '../../lib/content/parse.ts';
import { shuffleAvoiding } from './shuffle.ts';

/** True when the chunks, in the given order of indexes, spell the answer (punctuation and spaces ignored). */
export function isOrderCorrect(chunks: readonly string[], placed: readonly number[], answer: string): boolean {
  return normalizeForCompare(placed.map((i) => chunks[i]).join('')) === normalizeForCompare(answer);
}

/** The starting tile order (indexes into `chunks`): seeded, and never already the correct sentence. */
export function initialTileOrder(chunks: readonly string[], answer: string, seed: string): number[] {
  const indexes = chunks.map((_, i) => i);
  return shuffleAvoiding(indexes, seed, (order) => isOrderCorrect(chunks, order, answer));
}

/** Tapping a tile: moves it from the pool to the end of the answer line, or from the answer line back. */
export function toggleTile(placed: readonly number[], tile: number): number[] {
  return placed.includes(tile) ? placed.filter((t) => t !== tile) : [...placed, tile];
}

/** The pool: tiles in their starting order that are not on the answer line. */
export const poolTiles = (start: readonly number[], placed: readonly number[]) => start.filter((t) => !placed.includes(t));
