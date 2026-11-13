// The reading page's timer and "Done reading" (replaces the 5/10/15/20+ minute buttons).
// Its own component, so the once-a-second re-render touches only the timer, never the ink.

import { useEffect, useState } from 'react';
import type { Lesson } from '../../lib/content/types.ts';
import { tickBook, untickBook, useBookTicks } from '../../lib/plan/store.ts';
import type { PlanTask } from '../../lib/plan/tasks.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { mmss, roundMinutes } from './labels.ts';

const MAX_MINUTES = 240;

export function ReadingControls({ task, lesson }: { task: PlanTask; lesson: Pick<Lesson, 'level' | 'id'> }) {
  const timer = useActiveTimer();
  const [, setSecond] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecond((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { ticks, loaded } = useBookTicks();
  const done = ticks[task.id];
  const [minutes, setMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (minutes === null) return;
    setSaving(true);
    try {
      await tickBook(task, minutes, lesson);
      timer.reset(); // a later "Done again" logs only the time after this one
      setMinutes(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="np-reading">
      <span className="np-timer" role="timer" aria-label={`Reading time ${mmss(timer.elapsed())}`}>
        {mmss(timer.elapsed())}
      </span>
      {done && (
        <span className="np-done">
          <span>Done ✓ · {done.minutes} min</span>
          <button type="button" className="np-link" onClick={() => void untickBook(task.id)}>
            Untick
          </button>
        </span>
      )}
      {minutes === null && (
        <button
          type="button"
          className={done ? 'button button-quiet' : 'button'}
          disabled={!loaded}
          onClick={() => setMinutes(roundMinutes(timer.elapsed()))}
        >
          {done ? 'Done again' : 'Done reading'}
        </button>
      )}
      {minutes !== null && (
        <div className="np-confirm" role="group" aria-label="Confirm reading time">
          <span className="np-confirm-label">Reading time</span>
          <span className="np-stepper">
            <button type="button" className="np-tool" aria-label="One minute less" disabled={minutes <= 1} onClick={() => setMinutes(Math.max(1, minutes - 1))}>
              −
            </button>
            <strong className="np-minutes" aria-live="polite">
              {minutes} min
            </strong>
            <button type="button" className="np-tool" aria-label="One minute more" disabled={minutes >= MAX_MINUTES} onClick={() => setMinutes(Math.min(MAX_MINUTES, minutes + 1))}>
              +
            </button>
          </span>
          <span className="np-confirm-actions">
            <button type="button" className="button" disabled={saving} onClick={() => void save()}>
              Save
            </button>
            <button type="button" className="button button-quiet" disabled={saving} onClick={() => setMinutes(null)}>
              Cancel
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
