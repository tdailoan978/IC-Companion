import { describe, expect, it } from 'vitest';
import bundle from '../../generated/lessons.json';
import type { LessonBundle } from '../../lib/content/types.ts';
import { seededShuffle, shuffleAvoiding, shuffledIndexes } from './shuffle.ts';
import { initialTileOrder, isOrderCorrect, poolTiles, toggleTile } from './order.ts';
import { answerItem, currentItem, finishRun, isFinished, nextItem, positionLabel, score, startRun, wrongIds } from './run.ts';
import { allMatched, emptyBoard, matchColumns, matchResults, tap, type MatchItem } from './match.ts';

const lessons = (bundle as LessonBundle).lessons;

describe('shuffle', () => {
  it('is deterministic and keeps every item', () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6], 'L11.e2.1');
    expect(seededShuffle([1, 2, 3, 4, 5, 6], 'L11.e2.1')).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('never returns the identity order when another order exists', () => {
    for (let n = 2; n <= 8; n++) {
      for (let s = 0; s < 200; s++) {
        const order = shuffledIndexes(n, `seed-${s}`);
        expect(order.every((v, i) => v === i)).toBe(false);
        expect([...order].sort((x, y) => x - y)).toEqual(Array.from({ length: n }, (_, i) => i));
      }
    }
  });

  it('gives up gracefully when no acceptable order exists', () => {
    expect(shuffledIndexes(1, 'x')).toEqual([0]);
    expect(shuffleAvoiding(['a', 'a'], 'x', (o) => o.join('') === 'aa')).toEqual(['a', 'a']);
  });
});

describe('order exercise', () => {
  const chunks = ['冷', '比', '昨天', '今天'];
  const answer = '今天比昨天冷。';

  it('compares ignoring punctuation and spaces', () => {
    expect(isOrderCorrect(chunks, [3, 1, 2, 0], answer)).toBe(true);
    expect(isOrderCorrect(['冷是冷，', '可是'], [0, 1], '冷是冷可是')).toBe(true);
    expect(isOrderCorrect(chunks, [2, 1, 3, 0], answer)).toBe(false);
  });

  it('moves tiles to the answer line and back', () => {
    let placed = toggleTile([], 2);
    placed = toggleTile(placed, 0);
    expect(placed).toEqual([2, 0]);
    expect(poolTiles([3, 2, 1, 0], placed)).toEqual([3, 1]);
    expect(toggleTile(placed, 2)).toEqual([0]);
  });

  it('never starts in the correct order, for every shipped order item and many seeds', () => {
    for (const lesson of lessons) {
      for (const set of lesson.exercises) {
        if (set.type !== 'order') continue;
        for (const item of set.items) {
          for (let run = 0; run < 30; run++) {
            const start = initialTileOrder(item.chunks, item.answer, `${item.id}:${run}`);
            expect(start).toEqual(initialTileOrder(item.chunks, item.answer, `${item.id}:${run}`));
            expect(isOrderCorrect(item.chunks, start, item.answer), item.id).toBe(false);
          }
        }
      }
    }
  });

  it('avoids an order that is correct even when it is not the listed order', () => {
    // Two chunks: only one wrong order exists.
    for (let s = 0; s < 50; s++) expect(initialTileOrder(['你', '好'], '你好', `s${s}`)).toEqual([1, 0]);
  });
});

describe('run', () => {
  it('walks the queue one item at a time and scores it', () => {
    let run = startRun(['a', 'b', 'c']);
    expect(currentItem(run)).toBe('a');
    expect(positionLabel(run)).toBe('1 of 3');
    expect(nextItem(run)).toBe(run); // cannot skip an unanswered item
    run = answerItem(run, 'a', true);
    run = answerItem(run, 'a', false); // first answer counts
    run = nextItem(run);
    expect(positionLabel(run)).toBe('2 of 3');
    run = nextItem(answerItem(run, 'b', false));
    expect(isFinished(run)).toBe(false);
    run = nextItem(answerItem(run, 'c', false));
    expect(isFinished(run)).toBe(true);
    expect(score(run)).toBe(1);
    expect(wrongIds(run)).toEqual(['b', 'c']);
  });

  it('retries only the missed items and is marked as a retry', () => {
    const retry = startRun(['b', 'c'], true);
    expect(retry.retry).toBe(true);
    expect(retry.queue).toEqual(['b', 'c']);
    expect(answerItem(retry, 'a', true)).toBe(retry); // not in this run
  });
});

describe('match', () => {
  const items: MatchItem[] = [
    { id: 'm1', zh: '暖和', en: 'warm' },
    { id: 'm2', zh: '预报', en: 'forecast' },
    { id: 'm3', zh: '滑冰', en: 'to ice skate' },
  ];

  it('locks a right pair and scores it only without a miss', () => {
    let b = emptyBoard();
    b = tap(items, b, 'zh', 'm1').board;
    const wrong = tap(items, b, 'en', 'm2');
    expect(wrong.result).toEqual({ kind: 'wrong', zhId: 'm1', enId: 'm2' });
    b = tap(items, wrong.board, 'zh', 'm1').board;
    const right = tap(items, b, 'en', 'm1');
    expect(right.result).toEqual({ kind: 'right', zhId: 'm1', enId: 'm1', ok: false });
    b = right.board;
    // English first works too.
    b = tap(items, b, 'en', 'm2').board;
    const r2 = tap(items, b, 'zh', 'm2');
    expect(r2.result).toEqual({ kind: 'right', zhId: 'm2', enId: 'm2', ok: true });
    b = r2.board;
    // Matched cards ignore taps.
    expect(tap(items, b, 'zh', 'm1').board).toBe(b);
    expect(allMatched(items, b)).toBe(false);
    b = tap(items, tap(items, b, 'zh', 'm3').board, 'en', 'm3').board;
    expect(allMatched(items, b)).toBe(true);
    expect(matchResults(b)).toEqual({ m1: false, m2: true, m3: true });
  });

  it('a wrong pair started from the English side is a miss for the Chinese word', () => {
    let b = tap(items, emptyBoard(), 'en', 'm3').board;
    b = tap(items, b, 'zh', 'm2').board;
    expect(b.missed).toEqual(['m2']);
  });

  it('changes or clears the pick on the same side', () => {
    let b = tap(items, emptyBoard(), 'zh', 'm1').board;
    b = tap(items, b, 'zh', 'm2').board;
    expect(b.selected).toEqual({ side: 'zh', id: 'm2' });
    b = tap(items, b, 'zh', 'm2').board;
    expect(b.selected).toBeNull();
  });

  it('accepts either card when two words share a meaning', () => {
    const dup: MatchItem[] = [
      { id: 'd1', zh: '冷', en: 'cold' },
      { id: 'd2', zh: '凉', en: 'cold' },
    ];
    let b = tap(dup, emptyBoard(), 'zh', 'd1').board;
    const r = tap(dup, b, 'en', 'd2');
    expect(r.result).toMatchObject({ kind: 'right', ok: true });
    b = tap(dup, r.board, 'zh', 'd2').board;
    b = tap(dup, b, 'en', 'd1').board;
    expect(allMatched(dup, b)).toBe(true);
  });
});

describe('match columns', () => {
  it('shuffles both columns and never puts a meaning level with its word', () => {
    for (const lesson of lessons) {
      for (const set of lesson.exercises) {
        if (set.type !== 'match') continue;
        for (let s = 0; s < 30; s++) {
          const { zh, en } = matchColumns(set.items, `${set.id}:${s}`);
          expect(matchColumns(set.items, `${set.id}:${s}`)).toEqual({ zh, en });
          expect([...zh].sort((a, b) => a.id.localeCompare(b.id))).toEqual(set.items);
          expect(en.some((it, i) => it.en === zh[i].en), set.id).toBe(false);
        }
      }
    }
  });
});

describe('finishRun', () => {
  it('ends a run only when every item is answered', () => {
    let run = startRun(['a', 'b']);
    run = answerItem(run, 'b', true);
    expect(finishRun(run)).toBe(run);
    run = finishRun(answerItem(run, 'a', false));
    expect(isFinished(run)).toBe(true);
    expect(score(run)).toBe(1);
  });
});
