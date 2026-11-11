// Pure helpers for the Dialogues step (PLAN.md 5.2 step 4, read mode).

import type { Dialogue, DialogueTurn } from '../../lib/content/types.ts';

/** The narrator: shown as a centred block, not a speech bubble. */
export const NARRATOR = '旁白';

/** Number of bubble colour tones (see dialogue.css): 0 is the left speaker, 1-3 the others. */
export const TONES = 4;

export type SpeakerStyle = { side: 'left' | 'right' | 'narrator'; tone: number };

/**
 * Gives each speaker a fixed side and colour tone for the whole dialogue: the
 * first speaker on the left (tone 0), everyone else on the right with their
 * own tone (1, 2, 3, then repeating), the narrator centred.
 */
export function speakerStyles(turns: Pick<DialogueTurn, 'speaker'>[]): Map<string, SpeakerStyle> {
  const styles = new Map<string, SpeakerStyle>();
  let others = 0;
  let hasLeft = false;
  for (const { speaker } of turns) {
    if (styles.has(speaker)) continue;
    if (speaker === NARRATOR) styles.set(speaker, { side: 'narrator', tone: 0 });
    else if (!hasLeft) {
      styles.set(speaker, { side: 'left', tone: 0 });
      hasLeft = true;
    } else styles.set(speaker, { side: 'right', tone: 1 + (others++ % (TONES - 1)) });
  }
  return styles;
}

/** The dialogue to open with: the first one not yet read, else the first. */
export function initialDialogueId(dialogues: Pick<Dialogue, 'id'>[], done: Record<string, string>): string | undefined {
  return (dialogues.find((d) => !done[d.id]) ?? dialogues[0])?.id;
}

/** The dialogue to offer after finishing one: the next (wrapping round), if there is another. */
export function otherDialogue<T extends Pick<Dialogue, 'id'>>(dialogues: T[], currentId: string): T | undefined {
  if (dialogues.length < 2) return undefined;
  const i = dialogues.findIndex((d) => d.id === currentId);
  return dialogues[(i + 1) % dialogues.length];
}
