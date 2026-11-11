import { useRef, useState } from 'react';
import { getSettings } from '../../lib/settings.ts';
import type { Dialogue, Lesson } from '../../lib/content/types.ts';
import { logActivity, markDialogueDone, useLessonProgress } from '../../lib/progress.ts';
import { useActiveTimer } from '../../lib/timer.ts';
import { MixedText } from '../../app/MixedText.tsx';
import { Sentence } from '../../app/Sentence.tsx';
import { ToggleChip } from '../../app/ToggleChip.tsx';
import { initialDialogueId, otherDialogue, speakerStyles } from './dialogue.ts';
import './dialogue.css';

/** PLAN.md 5.2 step 4, read mode: chat bubbles per speaker, tap a line to hear it. */
export function DialogueStep({ lesson }: { lesson: Lesson }) {
  const { progress, loaded } = useLessonProgress(lesson);
  const [chosenId, setChosenId] = useState<string>();
  const [justFinished, setJustFinished] = useState<string>();
  const [showPinyin, setShowPinyin] = useState(getSettings().showPinyin);
  const [showEnglish, setShowEnglish] = useState(true);
  // Active time on the dialogue being read (PLAN.md 9.1); restarts when switching dialogues.
  const timer = useActiveTimer();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const { dialogues } = lesson;
  if (dialogues.length === 0) return <p className="muted">This lesson has no dialogues.</p>;

  // Until I pick one, open the first unread dialogue (once saved progress has loaded).
  const currentId = chosenId ?? (loaded ? initialDialogueId(dialogues, progress.dialoguesDone) : dialogues[0].id);
  const current = dialogues.find((d) => d.id === currentId) ?? dialogues[0];
  const index = dialogues.indexOf(current);
  const other = otherDialogue(dialogues, current.id);

  const choose = (id: string, focus = false) => {
    if (id !== current.id) timer.reset();
    setChosenId(id);
    setJustFinished(undefined);
    if (focus) {
      // After "go to the other dialogue" from the bottom: bring its title into view.
      requestAnimationFrame(() => {
        headingRef.current?.focus({ preventScroll: true });
        headingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  };

  const finish = () => {
    void markDialogueDone(lesson, current.id);
    void logActivity(lesson, 'dialogue', current.id, timer.elapsed(), current.turns.length);
    timer.reset();
    setChosenId(current.id); // stay here: the next unread dialogue is offered, not opened
    setJustFinished(current.id);
  };

  return (
    <div className="dialogue-step">
      <h1 className="dialogue-heading">Dialogues</h1>

      {dialogues.length > 1 && (
        <div className="dialogue-switch" role="group" aria-label="Choose a dialogue">
          {dialogues.map((d, i) => {
            const read = Boolean(progress.dialoguesDone[d.id]);
            return (
              <button
                key={d.id}
                type="button"
                className="dialogue-switch-button"
                aria-pressed={d.id === current.id}
                onClick={() => choose(d.id)}
              >
                <span className="dialogue-switch-top">
                  <span className="dialogue-switch-number">Dialogue {i + 1}</span>
                  {read && (
                    <span className="dialogue-read-badge">
                      <span aria-hidden="true">✓ </span>Read
                    </span>
                  )}
                </span>
                <span className="dialogue-switch-title">
                  <MixedText text={d.title} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="toggle-row" role="group" aria-label="Show with each line">
        <ToggleChip label="Pinyin" on={showPinyin} onChange={setShowPinyin} />
        <ToggleChip label="English" on={showEnglish} onChange={setShowEnglish} />
      </div>

      <section className="dialogue" aria-labelledby="dialogue-title">
        <h2 id="dialogue-title" className="dialogue-title" ref={headingRef} tabIndex={-1}>
          <span className="dialogue-title-number">Dialogue {index + 1}</span>
          <MixedText text={current.title} />
        </h2>
        {current.setting && (
          <p className="dialogue-setting">
            <MixedText text={current.setting} />
          </p>
        )}

        <DialogueTurns dialogue={current} showPinyin={showPinyin} showEnglish={showEnglish} />

        <div className="dialogue-end">
          {justFinished === current.id ? (
            <>
              <p className="dialogue-end-message" role="status">
                <span aria-hidden="true">✓ </span>Dialogue {index + 1} read.
                {other && progress.dialoguesDone[other.id] && ' Both dialogues are read.'}
              </p>
              {other && (
                <button type="button" className="button" onClick={() => choose(other.id, true)}>
                  Go to Dialogue {dialogues.indexOf(other) + 1} ›
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="button" onClick={finish}>
                Finished reading
              </button>
              {progress.dialoguesDone[current.id] && (
                <p className="muted dialogue-end-note">
                  <span aria-hidden="true">✓ </span>You have read this dialogue before.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function DialogueTurns({ dialogue, showPinyin, showEnglish }: { dialogue: Dialogue; showPinyin: boolean; showEnglish: boolean }) {
  const styles = speakerStyles(dialogue.turns);
  return (
    <ol className="dialogue-turns">
      {dialogue.turns.map((turn) => {
        const style = styles.get(turn.speaker)!; // every speaker is in the map
        if (style.side === 'narrator') {
          return (
            <li key={turn.id} className="dialogue-turn" data-side="narrator">
              <span className="visually-hidden">Narrator:</span>
              <Sentence sentence={turn} showPinyin={showPinyin} showEnglish={showEnglish} className="dialogue-narration" />
            </li>
          );
        }
        return (
          <li key={turn.id} className="dialogue-turn" data-side={style.side} data-tone={style.tone}>
            <span className="dialogue-speaker" lang="zh-Hans">
              {turn.speaker}
            </span>
            <Sentence sentence={turn} showPinyin={showPinyin} showEnglish={showEnglish} className="dialogue-bubble" />
          </li>
        );
      })}
    </ol>
  );
}
