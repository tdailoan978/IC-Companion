import { useState } from 'react';
import { speakChinese } from '../lib/speech.ts';

/** A round "hear it" button. Speaks inside the tap, as iOS requires. */
export function SpeakButton({ text, label, slow = false }: { text: string; label?: string; slow?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      className="speak-button"
      data-playing={playing}
      aria-label={label ?? `Hear ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        setPlaying(true);
        void speakChinese(text, { slow }).finally(() => setPlaying(false));
      }}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
