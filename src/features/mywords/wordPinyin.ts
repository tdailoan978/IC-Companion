// Pinyin for a word I add, in the textbook's style: a word's syllables written
// together ("tiānqì"), with an apostrophe before a syllable that starts with a
// vowel ("nǚ'ér"). Longer entries (phrases) keep a space between syllables.
// pinyin-pro is loaded only here, with a dynamic import, so app start stays fast.

const WORD_MAX = 4;
const VOWEL_START = /^[aeoāáǎàēéěèōóǒò]/i;

/** Joins syllables in the textbook's style. Pure. */
export function joinSyllables(syllables: string[]): string {
  const parts = syllables.map((s) => s.trim()).filter(Boolean);
  if (parts.length > WORD_MAX) return parts.join(' ');
  return parts.map((s, i) => (i > 0 && VOWEL_START.test(s) ? `'${s}` : s)).join('');
}

/** Pinyin with tone marks for Chinese text (empty for empty text). */
export async function pinyinFor(zh: string): Promise<string> {
  const text = zh.trim();
  if (!text) return '';
  const { pinyin } = await import('pinyin-pro');
  return joinSyllables(pinyin(text, { toneType: 'symbol', type: 'array', nonZh: 'consecutive' }));
}
