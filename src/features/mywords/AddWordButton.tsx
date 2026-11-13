import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { todayDay } from '../../lib/days.ts';
import { addMyWord } from '../../lib/mywords.ts';
import { noteKey, type NoteRef } from '../../lib/notes.ts';
import { pinyinFor } from './wordPinyin.ts';
import { checkWord, trimWord, WordFields, type WordDraft, type WordErrors } from './WordFields.tsx';
import './mywords.css';

const EMPTY: WordDraft = { zh: '', pinyin: '', en: '' };

/**
 * "Add to my words" on a note (docs/NOTES_AND_DEEP_LINKS.md section 4): a small sheet for the
 * Chinese, pinyin (filled in from the characters until I change it myself) and meaning. Saving
 * adds the word and its review card, first due tomorrow.
 */
export function AddWordButton({ note }: { note: NoteRef }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const zhRef = useRef<HTMLInputElement>(null);
  const enRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WordDraft>(EMPTY);
  const [errors, setErrors] = useState<WordErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);
  /** Once I edit the pinyin myself, it is no longer filled in for me. */
  const pinyinEdited = useRef(false);
  const latestZh = useRef('');
  const titleId = useId();

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 6000);
    return () => clearTimeout(t);
  }, [added]);

  function start() {
    setDraft(EMPTY);
    setErrors({});
    setSaveError(false);
    setAdded(false);
    pinyinEdited.current = false;
    latestZh.current = '';
    setOpen(true);
  }

  function change(field: keyof WordDraft, text: string) {
    setDraft((d) => ({ ...d, [field]: text }));
    if (field === 'pinyin') pinyinEdited.current = true;
    if (field === 'zh' || field === 'en') setErrors((e) => ({ ...e, [field]: undefined }));
    if (field === 'zh' && !pinyinEdited.current) {
      latestZh.current = text;
      pinyinFor(text).then(
        (py) => {
          if (latestZh.current === text && !pinyinEdited.current) setDraft((d) => ({ ...d, pinyin: py }));
        },
        (err) => console.warn('Could not fill in pinyin', err),
      );
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const found = checkWord(draft);
    setErrors(found);
    if (found.zh) return zhRef.current?.focus();
    if (found.en) return enRef.current?.focus();
    setSaving(true);
    setSaveError(false);
    let word = trimWord(draft);
    // Saved before the automatic pinyin arrived: fill it in now rather than store none or a stale one.
    if (!pinyinEdited.current) {
      try {
        word = { ...word, pinyin: await pinyinFor(word.zh) };
      } catch (err) {
        console.warn('Could not fill in pinyin', err);
      }
    }
    const saved = await addMyWord({ ...word, level: note.level, lessonId: note.lessonId, noteKey: noteKey(note) }, todayDay());
    setSaving(false);
    if (!saved) {
      setSaveError(true);
      return;
    }
    dialog.current?.close();
    setAdded(true);
  }

  return (
    <div className="add-word">
      <button type="button" className="button button-quiet" onClick={start}>
        <span aria-hidden="true">＋</span> Add to my words
      </button>
      <p role="status" className="add-word-status">
        {added && (
          <>
            <span aria-hidden="true">✓ </span>Added — first review tomorrow
          </>
        )}
      </p>
      {open && (
        <dialog ref={dialog} className="mw-sheet" aria-labelledby={titleId} onClose={() => setOpen(false)}>
          <form onSubmit={save} noValidate>
            <h2 id={titleId}>Add to my words</h2>
            <WordFields
              value={draft}
              errors={errors}
              onChange={change}
              pinyinHint="Filled in from the characters. You can change it."
              zhRef={zhRef}
              enRef={enRef}
            />
            {saveError && (
              <p role="alert" className="mw-error">
                The word could not be saved on this device. Try again.
              </p>
            )}
            <div className="mw-sheet-actions">
              <button type="button" className="button button-quiet" onClick={() => dialog.current?.close()}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving}>
                Add word
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
