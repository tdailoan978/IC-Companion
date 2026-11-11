import { useEffect, useId, useReducer, useState } from 'react';
import { updateSettings, useSettings } from '../../lib/settings.ts';
import {
  currentVoice,
  getSpeechStatus,
  mandarinVoices,
  pickVoice,
  speakChinese,
  subscribeSpeechStatus,
  voiceQuality,
  type VoiceLike,
} from '../../lib/speech.ts';
import { Segmented, SettingsSection } from './controls.tsx';

const SAMPLE = '你好！我们今天学习中文。';

const RATES = [
  { value: 'slow', label: 'Slow' },
  { value: 'normal', label: 'Normal' },
] as const;

const REGION: Record<string, string> = {
  'zh-cn': 'China mainland',
  'zh-tw': 'Taiwan',
  'zh-sg': 'Singapore',
  cmn: 'Mandarin',
};

function describeVoice(v: VoiceLike): string {
  const lang = v.lang.replace('_', '-');
  const region = REGION[lang.toLowerCase()];
  const quality = voiceQuality(v);
  const parts = [region ? `${region} (${lang})` : lang];
  if (quality === 'premium') parts.push('Premium');
  else if (quality === 'enhanced') parts.push('Enhanced');
  else if (quality === 'novelty') parts.push('Novelty voice');
  if (!v.localService) parts.push('Online');
  return parts.join(' · ');
}

export function SpeechSettings() {
  const settings = useSettings();
  // Voices arrive late (and the chosen one changes after a pick): re-render on every speech update.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const unsubscribe = subscribeSpeechStatus(refresh);
    return () => {
      unsubscribe();
    };
  }, []);
  const status = getSpeechStatus();
  const voices = mandarinVoices();
  const using = currentVoice();
  const best = pickVoice(voices, null);
  const savedMissing = settings.voiceURI !== null && voices.length > 0 && !voices.some((v) => v.voiceURI === settings.voiceURI);
  const [playing, setPlaying] = useState(false);
  const legendId = useId();

  return (
    <SettingsSection title="Speech">
      <Segmented
        label="Speech rate"
        hint="Slow is useful for new words; Normal for dialogues."
        value={settings.speechRate}
        options={RATES}
        onChange={(speechRate) => updateSettings({ speechRate })}
      />

      {status === 'unsupported' && (
        <p className="notice settings-notice" role="status">
          This browser cannot speak, so the hear buttons will stay silent. Open the app in Safari on the iPad.
        </p>
      )}

      {status === 'no-voice' && (
        <div className="notice settings-notice" role="status">
          <p>No Chinese voice is installed on this iPad, so Chinese is read badly or not at all. To add one:</p>
          <ol>
            <li>Open the iPad's Settings app.</li>
            <li>Accessibility → Spoken Content → Voices.</li>
            <li>Choose Chinese (China mainland) and download a voice (for example Tingting, Enhanced if offered).</li>
            <li>Come back here and reopen the app.</li>
          </ol>
        </div>
      )}

      {status === 'loading' && <p className="setting-hint settings-pad">Looking for Chinese voices…</p>}

      {voices.length > 0 && (
        <fieldset className="setting voice-picker" aria-describedby={`${legendId}-hint`}>
          <legend className="setting-label">Voice</legend>
          <span id={`${legendId}-hint`} className="setting-hint">
            Enhanced and Premium voices sound most natural. More can be downloaded in the iPad's Settings →
            Accessibility → Spoken Content → Voices.
          </span>
          <div className="voice-options">
            <label className="voice-option">
              <input
                type="radio"
                name="voice"
                checked={settings.voiceURI === null || savedMissing}
                onChange={() => updateSettings({ voiceURI: null })}
              />
              <span className="voice-text">
                <span className="voice-name">Best available</span>
                <span className="voice-meta">{best ? `Now ${best.name}, ${describeVoice(best)}` : 'Chosen automatically'}</span>
              </span>
            </label>
            {voices.map((v) => (
              <label key={v.voiceURI} className="voice-option">
                <input
                  type="radio"
                  name="voice"
                  value={v.voiceURI}
                  checked={settings.voiceURI === v.voiceURI}
                  onChange={() => updateSettings({ voiceURI: v.voiceURI })}
                />
                <span className="voice-text">
                  <span className="voice-name">{v.name}</span>
                  <span className="voice-meta">{describeVoice(v)}</span>
                </span>
              </label>
            ))}
          </div>
          {savedMissing && (
            <p className="setting-hint">The voice you picked before is not on this iPad any more, so the best available one is used.</p>
          )}
        </fieldset>
      )}

      {status !== 'unsupported' && (
        <div className="setting">
          <div className="setting-text">
            <span className="setting-label">Try it</span>
            <span className="setting-hint">
              <span lang="zh-Hans">{SAMPLE}</span>
              {using ? ` (${using.name})` : ''}
            </span>
          </div>
          <button
            type="button"
            className="button"
            data-playing={playing}
            onClick={() => {
              // Speak inside the tap itself: iOS blocks speech started later.
              setPlaying(true);
              void speakChinese(SAMPLE).finally(() => setPlaying(false));
            }}
          >
            {playing ? 'Speaking…' : 'Test voice'}
          </button>
        </div>
      )}
    </SettingsSection>
  );
}
