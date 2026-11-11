import { useSyncExternalStore } from 'react';
import { getSaveFailed, subscribeSaveFailed } from '../lib/storage.ts';

/** Shown while saving to the device is failing, so ticks are never lost silently. */
export function SaveNotice() {
  const failed = useSyncExternalStore(subscribeSaveFailed, getSaveFailed);
  if (!failed) return null;
  return (
    <p className="notice save-notice" role="alert">
      Progress could not be saved on this iPad just now. Close the app fully and reopen it; if this keeps
      showing, tell Claude.
    </p>
  );
}
