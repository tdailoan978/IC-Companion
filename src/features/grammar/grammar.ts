// Pure helpers for the Grammar step (PLAN.md 5.2 step 3).

import type { GrammarPoint } from '../../lib/content/types.ts';

export type PatternPiece = { kind: 'code' | 'join'; text: string };

/**
 * The pattern box's pieces: each backticked part as a highlighted line, and the
 * joining words between them ("compared with", "negative:") as plain text.
 * Joining words lose the leading punctuation they keep in the source
 * ("; negative:" → "negative:", "· with an object:" → "with an object:");
 * a bare separator such as "·" is dropped, since each part has its own line.
 * A part with " · " inside is split into one line per pattern.
 */
export function patternPieces(parts: GrammarPoint['patternParts']): PatternPiece[] {
  const pieces: PatternPiece[] = [];
  for (const part of parts) {
    if (part.code) {
      // One backticked part can hold several patterns joined by " · " (L20 的/得/地): a line each.
      for (const line of part.text.split(/\s+·\s+/u)) {
        const text = line.trim();
        if (text) pieces.push({ kind: 'code', text });
      }
      continue;
    }
    const text = part.text.replace(/^[\s;,；，·・]+/u, '').trim();
    if (text) pieces.push({ kind: 'join', text });
  }
  return pieces;
}

/** The explanation as paragraphs (blank lines separate them). */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

/** How many of the lesson's grammar points are marked "Got it". */
export const understoodCount = (grammar: Pick<GrammarPoint, 'id'>[], done: Record<string, string>) =>
  grammar.filter((g) => done[g.id]).length;
