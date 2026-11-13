import { useId, type Ref } from 'react';

export type WordDraft = { zh: string; pinyin: string; en: string };
export type WordErrors = Partial<Record<'zh' | 'en', string>>;

/** Chinese and meaning are required; pinyin may be left empty. */
export function checkWord(w: WordDraft): WordErrors {
  const errors: WordErrors = {};
  if (!w.zh.trim()) errors.zh = 'Enter the word in Chinese.';
  if (!w.en.trim()) errors.en = 'Enter what it means.';
  return errors;
}

export const trimWord = (w: WordDraft): WordDraft => ({ zh: w.zh.trim(), pinyin: w.pinyin.trim(), en: w.en.trim() });

/** The three fields of a word (Add to my words, and editing in My words). */
export function WordFields({
  value,
  errors,
  onChange,
  pinyinHint,
  zhRef,
  enRef,
}: {
  value: WordDraft;
  errors: WordErrors;
  onChange: (field: keyof WordDraft, text: string) => void;
  pinyinHint?: string;
  zhRef?: Ref<HTMLInputElement>;
  enRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  return (
    <div className="mw-fields">
      <div className="mw-field">
        <label htmlFor={`${id}-zh`}>Chinese</label>
        <input
          id={`${id}-zh`}
          ref={zhRef}
          lang="zh-Hans"
          className="mw-input mw-input-zh"
          value={value.zh}
          onChange={(e) => onChange('zh', e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={errors.zh ? true : undefined}
          aria-describedby={errors.zh ? `${id}-zh-error` : undefined}
        />
        {errors.zh && (
          <p id={`${id}-zh-error`} className="mw-error">
            {errors.zh}
          </p>
        )}
      </div>
      <div className="mw-field">
        <label htmlFor={`${id}-py`}>Pinyin</label>
        <input
          id={`${id}-py`}
          className="mw-input pinyin-input"
          value={value.pinyin}
          onChange={(e) => onChange('pinyin', e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby={pinyinHint ? `${id}-py-hint` : undefined}
        />
        {pinyinHint && (
          <p id={`${id}-py-hint`} className="mw-hint muted">
            {pinyinHint}
          </p>
        )}
      </div>
      <div className="mw-field">
        <label htmlFor={`${id}-en`}>Meaning</label>
        <input
          id={`${id}-en`}
          ref={enRef}
          lang="en"
          className="mw-input"
          value={value.en}
          onChange={(e) => onChange('en', e.target.value)}
          autoComplete="off"
          aria-invalid={errors.en ? true : undefined}
          aria-describedby={errors.en ? `${id}-en-error` : undefined}
        />
        {errors.en && (
          <p id={`${id}-en-error`} className="mw-error">
            {errors.en}
          </p>
        )}
      </div>
    </div>
  );
}
