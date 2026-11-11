// Applies settings that live outside React: the Chinese font size (a CSS
// variable) and the speech voice and rate. Runs at start-up and on every change.

import { loadSettings, subscribeSettings, getSettings, ZH_SIZE_PX } from '../lib/settings.ts';
import { prepareSpeech, RATE_NORMAL, RATE_SLOW } from '../lib/speech.ts';

let last = '';

function apply() {
  const s = getSettings();
  document.documentElement.style.setProperty('--zh-size', `${ZH_SIZE_PX[s.zhSize]}px`);
  const speechKey = `${s.voiceURI}|${s.speechRate}`;
  if (speechKey !== last) {
    last = speechKey;
    void prepareSpeech({ voiceURI: s.voiceURI, rate: s.speechRate === 'slow' ? RATE_SLOW : RATE_NORMAL });
  }
}

export function startSettings(): void {
  subscribeSettings(apply);
  // Get voices ready straight away, before settings load (iOS loads them late).
  void prepareSpeech();
  void loadSettings().then(apply);
}
