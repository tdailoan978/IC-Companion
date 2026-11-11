// Active study time: counts only while the app is on screen, so a session left
// open in the background does not inflate the study plan's estimates.

import { useEffect, useRef } from 'react';

export type ActiveTimer = { elapsed: () => number; reset: () => void; dispose: () => void };

export function createActiveTimer(): ActiveTimer {
  let total = 0;
  let since: number | null = document.visibilityState === 'visible' ? performance.now() : null;
  const onVisibility = () => {
    if (document.visibilityState === 'visible') since ??= performance.now();
    else if (since !== null) {
      total += performance.now() - since;
      since = null;
    }
  };
  document.addEventListener('visibilitychange', onVisibility);
  return {
    elapsed: () => total + (since === null ? 0 : performance.now() - since),
    reset: () => {
      total = 0;
      since = document.visibilityState === 'visible' ? performance.now() : null;
    },
    dispose: () => document.removeEventListener('visibilitychange', onVisibility),
  };
}

/** A timer that starts when the component mounts. Call reset() when a new unit begins. */
export function useActiveTimer(): Pick<ActiveTimer, 'elapsed' | 'reset'> {
  const timer = useRef<ActiveTimer | null>(null);
  useEffect(() => {
    timer.current = createActiveTimer();
    return () => timer.current?.dispose();
  }, []);
  return {
    elapsed: () => timer.current?.elapsed() ?? 0,
    reset: () => timer.current?.reset(),
  };
}
