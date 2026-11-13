import { describe, expect, it } from 'vitest';
import { joinSyllables, pinyinFor } from './wordPinyin.ts';

describe('pinyin for my words', () => {
  it('writes a word as one, with an apostrophe before a vowel syllable', () => {
    expect(joinSyllables(['tiān', 'qì'])).toBe('tiānqì');
    expect(joinSyllables(['nǚ', 'ér'])).toBe("nǚ'ér");
    expect(joinSyllables(['wǒ', 'men', 'qù', 'gōng', 'yuán'])).toBe('wǒ men qù gōng yuán');
  });

  it('fills pinyin with tone marks from the characters', async () => {
    expect(await pinyinFor('天气')).toBe('tiānqì');
    expect(await pinyinFor('  ')).toBe('');
  });
});
