import { useState } from 'react';
import { SpeakButton } from '../../app/SpeakButton.tsx';
import { Feedback } from './Feedback.tsx';
import { initialTileOrder, isOrderCorrect, poolTiles, toggleTile } from './order.ts';

type Item = { id: string; chunks: string[]; answer: string };

/** Tap the word tiles in order to build the sentence; tap a placed tile to send it back. */
export function OrderItem({ item, seed, onAnswer }: { item: Item; seed: string; onAnswer: (ok: boolean) => void }) {
  const [start] = useState(() => initialTileOrder(item.chunks, item.answer, seed));
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const pool = poolTiles(start, placed);
  const locked = checked !== null;

  const tile = (t: number, where: 'line' | 'pool') => (
    <button
      key={t}
      type="button"
      className="ex-tile"
      disabled={locked}
      onClick={() => setPlaced((p) => toggleTile(p, t))}
      aria-label={`${item.chunks[t]}, ${where === 'pool' ? 'add to the sentence' : 'take back'}`}
    >
      <span lang="zh-Hans">{item.chunks[t]}</span>
    </button>
  );

  return (
    <div className="ex-item">
      <p className="ex-instruction muted">Tap the words in order to build the sentence. Tap a placed word to take it back.</p>

      <div className="ex-line" role="group" aria-label="Your sentence" data-checked={checked ?? undefined}>
        {placed.length === 0 ? <span className="ex-line-empty muted">Your sentence</span> : placed.map((t) => tile(t, 'line'))}
      </div>

      <div className="ex-pool" role="group" aria-label="Words to place">
        {pool.map((t) => tile(t, 'pool'))}
      </div>

      {!locked && (
        <div className="ex-actions">
          <button
            type="button"
            className="button"
            disabled={pool.length > 0}
            onClick={() => {
              const ok = isOrderCorrect(item.chunks, placed, item.answer);
              setChecked(ok);
              onAnswer(ok);
            }}
          >
            Check
          </button>
          {placed.length > 0 && (
            <button type="button" className="button button-quiet" onClick={() => setPlaced([])}>
              Start over
            </button>
          )}
        </div>
      )}

      <Feedback ok={checked}>
        <p>{checked ? 'Right.' : 'Not quite. The sentence is:'}</p>
        <div className="ex-answer-row">
          <span lang="zh-Hans" className="ex-answer-zh">{item.answer}</span>
          <SpeakButton text={item.answer} label="Hear the sentence" />
        </div>
      </Feedback>
    </div>
  );
}
