// Chinese text-to-speech with the Web Speech API (PLAN.md section 6).
// Adapted from the Mandarin app's speech code, which is tested on iOS:
// - iOS only allows speak() inside the tap itself, so nothing here awaits
//   before speaking: voices are prepared ahead of time by prepareSpeech().
// - Voices arrive late on iOS, so prepareSpeech() waits for voiceschanged.
// - Some voices "finish" instantly without a sound; those fall back to the
//   device default and are remembered as silent.

export type VoiceLike = { name: string; lang: string; localService: boolean; voiceURI: string };

export const RATE_NORMAL = 0.9;
export const RATE_SLOW = 0.7;

// Apple's novelty voices use an older, cruder engine.
const NOVELTY = /^(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;
const QUALITY = { premium: 3, enhanced: 2, standard: 1, novelty: 0 } as const;
type Quality = keyof typeof QUALITY;

const langOf = (v: VoiceLike) => v.lang.replace('_', '-').toLowerCase();

/** Mandarin only: zh-HK and Cantonese voices would teach the wrong language. */
export function isMandarinVoice(v: VoiceLike): boolean {
  const lang = langOf(v);
  return (lang === 'cmn' || lang.startsWith('zh') || lang.startsWith('cmn-')) && !/^zh-(hk|mo)|yue/.test(lang);
}

export function voiceQuality(v: VoiceLike): Quality {
  const label = `${v.name} ${v.voiceURI}`;
  if (NOVELTY.test(v.name) || /eloquence/i.test(v.voiceURI)) return 'novelty';
  if (/premium/i.test(label)) return 'premium';
  if (/enhanced/i.test(label)) return 'enhanced';
  return 'standard';
}

/** Best first: quality, then zh-CN over zh-TW, then on-device voices. */
export function rankVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  const score = (v: T) => QUALITY[voiceQuality(v)] * 10 + (langOf(v) === 'zh-cn' ? 4 : 0) + (v.localService ? 1 : 0);
  return voices.filter(isMandarinVoice).sort((a, b) => score(b) - score(a));
}

export function pickVoice<T extends VoiceLike>(voices: readonly T[], savedURI?: string | null): T | null {
  const ranked = rankVoices(voices);
  return ranked.find((v) => v.voiceURI === savedURI) ?? ranked[0] ?? null;
}

export const speechSupported = () => typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis;

/** A real word takes about a second; anything shorter than this was silent. */
const SILENT_MS = 250;
/** Time allowed for speech to begin before the voice is treated as failed. */
const STALL_MS = 3000;

// ---- prepared state (filled before any tap) ----

let voices: SpeechSynthesisVoice[] = [];
let chosen: SpeechSynthesisVoice | null = null;
let rate = RATE_NORMAL;
const silent = new Set<string>();
let status: SpeechStatus = 'loading';
const listeners = new Set<() => void>();

/**
 * - `loading`: voices not read yet.
 * - `ready`: a Mandarin voice is available.
 * - `no-voice`: speech works but there is no Chinese voice (show how to add one).
 * - `unsupported`: no speech synthesis at all.
 */
export type SpeechStatus = 'loading' | 'ready' | 'no-voice' | 'unsupported';

function setStatus(next: SpeechStatus) {
  status = next;
  listeners.forEach((l) => l());
}

export const getSpeechStatus = () => status;
export function subscribeSpeechStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Voices can arrive late on iOS, so this waits briefly for them. */
function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  const read = () => rankVoices(speechSynthesis.getVoices());
  if (speechSynthesis.getVoices().length) return Promise.resolve(read());
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(read());
    };
    const timer = setTimeout(finish, timeoutMs);
    speechSynthesis.addEventListener('voiceschanged', finish);
  });
}

/** Call once at start-up (and again when settings change). Never call it inside a tap before speaking. */
export async function prepareSpeech(options: { voiceURI?: string | null; rate?: number } = {}): Promise<void> {
  if (!speechSupported()) return setStatus('unsupported');
  voices = voices.length ? voices : await loadVoices();
  chosen = pickVoice(voices, options.voiceURI);
  if (options.rate) rate = options.rate;
  setStatus(chosen ? 'ready' : 'no-voice');
}

export const mandarinVoices = () => voices;
export const currentVoice = () => chosen;

// Held so the utterance isn't garbage-collected mid-sentence (WebKit cuts it off),
// and to tell a replaced utterance's late events apart from the live one.
let current: SpeechSynthesisUtterance | null = null;

export function stopSpeech(): void {
  if (!speechSupported()) return;
  current = null;
  speechSynthesis.cancel();
}

/**
 * Speaks a whole word or sentence. Call it directly from a tap handler.
 * Resolves true when speech ended normally, false if it was cut off or nothing could play.
 */
export function speakChinese(text: string, opts: { slow?: boolean } = {}): Promise<boolean> {
  if (!speechSupported()) return Promise.resolve(false);
  const voice = chosen && !silent.has(chosen.voiceURI) ? chosen : null;
  return new Promise((resolve) => run(text, voice, opts.slow ? RATE_SLOW : rate, resolve));
}

function run(text: string, voice: SpeechSynthesisVoice | null, r: number, done: (ok: boolean) => void) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? 'zh-CN';
  if (voice) u.voice = voice;
  u.rate = r;
  let startedAt: number | null = null;
  const stale = () => current !== u;
  const fail = () => {
    clearTimeout(stall);
    if (stale()) return done(false);
    if (voice) {
      silent.add(voice.voiceURI);
      run(text, null, r, done);
    } else {
      done(false);
    }
  };
  const stall = setTimeout(fail, STALL_MS);
  u.onstart = () => {
    if (stale()) return;
    clearTimeout(stall);
    startedAt = Date.now();
  };
  u.onend = () => {
    if (stale()) return done(false);
    clearTimeout(stall);
    if (startedAt !== null && Date.now() - startedAt >= SILENT_MS) done(true);
    else fail();
  };
  u.onerror = fail;
  current = u;
  speechSynthesis.speak(u);
}
