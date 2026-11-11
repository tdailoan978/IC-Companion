import { useSyncExternalStore } from 'react';
import { getSpeechStatus, subscribeSpeechStatus } from '../lib/speech.ts';

/** Says plainly when the iPad cannot speak Chinese, instead of buttons failing silently. */
export function SpeechNotice() {
  const status = useSyncExternalStore(subscribeSpeechStatus, getSpeechStatus);
  if (status === 'ready' || status === 'loading') return null;
  return (
    <p className="notice" role="status">
      {status === 'unsupported'
        ? 'This browser cannot speak, so the hear buttons will stay silent.'
        : 'No Chinese voice is installed. On the iPad: Settings → Accessibility → Spoken Content → Voices → Chinese (China mainland), then download one (for example Tingting) and reopen the app.'}
    </p>
  );
}
