// The matching exercise: pick a Chinese word and an English meaning (either
// side first). A right pair locks both cards; a wrong pair is a miss for that
// Chinese word. A word scores only if it was matched with no miss.

import { seededShuffle, shuffleAvoiding } from './shuffle.ts';

export type MatchItem = { id: string; zh: string; en: string };

export type Selection = { side: 'zh' | 'en'; id: string } | null;

export type MatchBoard = {
  /** Chinese cards that are matched (item ids). */
  matchedZh: string[];
  /** English cards that are matched (item ids). */
  matchedEn: string[];
  /** Chinese item ids that had at least one wrong pair. */
  missed: string[];
  selected: Selection;
};

export type PairResult =
  | { kind: 'select' }
  | { kind: 'right'; zhId: string; enId: string; ok: boolean }
  | { kind: 'wrong'; zhId: string; enId: string };

export const emptyBoard = (): MatchBoard => ({ matchedZh: [], matchedEn: [], missed: [], selected: null });

/** A meaning fits a word if it is that item's meaning, or the same English text (two words can share one). */
export function fits(items: readonly MatchItem[], zhId: string, enId: string): boolean {
  if (zhId === enId) return true;
  const zh = items.find((i) => i.id === zhId);
  const en = items.find((i) => i.id === enId);
  return Boolean(zh && en && zh.en === en.en);
}

export const isLocked = (board: MatchBoard, side: 'zh' | 'en', id: string) =>
  (side === 'zh' ? board.matchedZh : board.matchedEn).includes(id);

/** One tap on a card. Returns the new board and what happened. */
export function tap(items: readonly MatchItem[], board: MatchBoard, side: 'zh' | 'en', id: string): { board: MatchBoard; result: PairResult } {
  if (isLocked(board, side, id)) return { board, result: { kind: 'select' } };
  const sel = board.selected;
  if (!sel || sel.side === side) {
    // First pick, or a change of mind on the same side; tapping the picked card again clears it.
    const selected = sel?.id === id ? null : { side, id };
    return { board: { ...board, selected }, result: { kind: 'select' } };
  }
  const zhId = side === 'zh' ? id : sel.id;
  const enId = side === 'en' ? id : sel.id;
  if (fits(items, zhId, enId)) {
    const ok = !board.missed.includes(zhId);
    const next = { ...board, matchedZh: [...board.matchedZh, zhId], matchedEn: [...board.matchedEn, enId], selected: null };
    return { board: next, result: { kind: 'right', zhId, enId, ok } };
  }
  const missed = board.missed.includes(zhId) ? board.missed : [...board.missed, zhId];
  return { board: { ...board, missed, selected: null }, result: { kind: 'wrong', zhId, enId } };
}

export const allMatched = (items: readonly MatchItem[], board: MatchBoard) => items.every((i) => board.matchedZh.includes(i.id));

/** Item id → correct (matched with no miss), for the matched items only. */
export function matchResults(board: MatchBoard): Record<string, boolean> {
  return Object.fromEntries(board.matchedZh.map((id) => [id, !board.missed.includes(id)]));
}

/**
 * Both columns in a seeded order. The English column is shuffled so that no
 * meaning sits level with its own word (whenever that is possible).
 */
export function matchColumns<T extends MatchItem>(items: readonly T[], seed: string): { zh: T[]; en: T[] } {
  const zh = seededShuffle(items, `${seed}:zh`);
  const en = shuffleAvoiding(items, `${seed}:en`, (order) => items.length > 1 && order.some((it, i) => it.en === zh[i].en));
  return { zh, en };
}
