import { describe, expect, it } from 'vitest';
import { isMandarinVoice, pickVoice, rankVoices, type VoiceLike } from './speech.ts';

const v = (name: string, lang: string, voiceURI = `com.apple.voice.compact.${lang}.${name}`, localService = true): VoiceLike => ({
  name,
  lang,
  voiceURI,
  localService,
});

describe('voice choice', () => {
  const tingting = v('Tingting', 'zh-CN');
  const tingtingEnhanced = v('Tingting', 'zh-CN', 'com.apple.voice.enhanced.zh-CN.Tingting');
  const meijia = v('Meijia', 'zh-TW');
  const sinji = v('Sinji', 'zh-HK');
  const eddy = v('Eddy (Chinese (China mainland))', 'zh-CN');
  const samantha = v('Samantha', 'en-US');

  it('keeps Mandarin voices only', () => {
    expect([tingting, meijia, sinji, samantha].filter(isMandarinVoice)).toEqual([tingting, meijia]);
  });

  it('ranks enhanced above standard, zh-CN above zh-TW, novelty last', () => {
    expect(rankVoices([eddy, meijia, tingting, tingtingEnhanced])).toEqual([tingtingEnhanced, tingting, meijia, eddy]);
  });

  it('prefers the saved voice, else the best one, else null', () => {
    expect(pickVoice([tingting, meijia], meijia.voiceURI)).toBe(meijia);
    expect(pickVoice([tingting, meijia], 'gone')).toBe(tingting);
    expect(pickVoice([samantha])).toBeNull();
  });
});
