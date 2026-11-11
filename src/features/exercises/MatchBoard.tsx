import { useEffect, useRef, useState, type ReactNode } from 'react';
import { allMatched, emptyBoard, isLocked, matchColumns, tap, type MatchItem } from './match.ts';

type Flash = { zhId: string; enId: string } | null;

/**
 * All words at once: tap a Chinese word, then its meaning (or the other way
 * round). A right pair locks; a wrong pair flashes and counts as a miss.
 */
export function MatchBoard({
  items,
  seed,
  onMatch,
  onFinish,
}: {
  items: MatchItem[];
  seed: string;
  onMatch: (itemId: string, ok: boolean) => void;
  onFinish: () => void;
}) {
  const [columns] = useState(() => matchColumns(items, seed));
  const [board, setBoard] = useState(emptyBoard);
  const [flash, setFlash] = useState<Flash>(null);
  const [message, setMessage] = useState<ReactNode>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const byId = (id: string) => items.find((i) => i.id === id);
  const done = allMatched(items, board);

  const onTap = (side: 'zh' | 'en', id: string) => {
    const { board: next, result } = tap(items, board, side, id);
    setBoard(next);
    if (result.kind === 'right') {
      setFlash(null);
      setMessage(
        <>
          <span aria-hidden="true">✓ </span>
          <span lang="zh-Hans" className="zh-inline">{byId(result.zhId)?.zh}</span> means “{byId(result.enId)?.en}”
          {result.ok ? '.' : ' (it had a miss, so it goes to the retry list).'}
        </>,
      );
      onMatch(result.zhId, result.ok);
    } else if (result.kind === 'wrong') {
      setFlash(result);
      setMessage(
        <>
          <span aria-hidden="true">✗ </span>
          <span lang="zh-Hans" className="zh-inline">{byId(result.zhId)?.zh}</span> does not mean “{byId(result.enId)?.en}”. Try again.
        </>,
      );
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(null), 900);
    }
  };

  const card = (side: 'zh' | 'en', it: MatchItem) => {
    const locked = isLocked(board, side, it.id);
    const selected = board.selected?.side === side && board.selected.id === it.id;
    const wrong = flash !== null && (side === 'zh' ? flash.zhId : flash.enId) === it.id;
    const state = locked ? 'done' : wrong ? 'wrong' : selected ? 'selected' : undefined;
    const text = side === 'zh' ? it.zh : it.en;
    return (
      <li key={it.id}>
        <button
          type="button"
          className={`ex-card ex-card-${side}`}
          data-state={state}
          aria-pressed={locked ? undefined : selected}
          disabled={locked}
          onClick={() => onTap(side, it.id)}
        >
          <span className="ex-card-mark" aria-hidden="true">
            {locked ? '✓' : wrong ? '✗' : selected ? '●' : ''}
          </span>
          <span lang={side === 'zh' ? 'zh-Hans' : undefined} className="ex-card-text">
            {text}
          </span>
          {locked && <span className="visually-hidden">, matched</span>}
        </button>
      </li>
    );
  };

  return (
    <div className="ex-item">
      <p className="ex-instruction muted">Tap a Chinese word, then its meaning.</p>
      <p className="ex-match-count">
        {board.matchedZh.length} of {items.length} matched
      </p>
      <div className="ex-match">
        <ul className="ex-column" aria-label="Chinese words">
          {columns.zh.map((it) => card('zh', it))}
        </ul>
        <ul className="ex-column" aria-label="English meanings">
          {columns.en.map((it) => card('en', it))}
        </ul>
      </div>
      <p className="ex-match-message" role="status">
        {message}
      </p>
      {done && (
        <div className="ex-actions">
          <button type="button" className="button" onClick={onFinish}>
            See score
          </button>
        </div>
      )}
    </div>
  );
}
