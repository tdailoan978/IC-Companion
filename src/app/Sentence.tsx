import type { Sentence as SentenceData } from '../lib/content/types.ts';
import { speakChinese } from '../lib/speech.ts';

type Props = {
  sentence: SentenceData;
  showPinyin?: boolean;
  showEnglish?: boolean;
  /** Extra class for layout (e.g. a dialogue bubble). */
  className?: string;
  /** Set while this line is being played (listen mode, later). */
  active?: boolean;
};

/**
 * One Chinese sentence with optional pinyin and English. The whole block is
 * a button: tapping it reads the Chinese aloud.
 */
export function Sentence({ sentence, showPinyin = true, showEnglish = true, className, active }: Props) {
  return (
    <button
      type="button"
      className={`sentence ${className ?? ''}`}
      data-active={active || undefined}
      onClick={() => void speakChinese(sentence.zh)}
      aria-label={`${sentence.zh}. ${showEnglish ? sentence.en : ''} Tap to hear.`}
    >
      {showPinyin && <span className="sentence-pinyin pinyin">{sentence.pinyin}</span>}
      <span lang="zh-Hans" className="sentence-zh">
        {sentence.zh}
      </span>
      {showEnglish && <span className="sentence-en">{sentence.en}</span>}
    </button>
  );
}
