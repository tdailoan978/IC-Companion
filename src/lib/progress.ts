// Lesson progress (PLAN.md 5.2 and milestone 4). One record per lesson in
// IndexedDB, written on every change so closing the app never loses an answer.
// Screens report what was finished; the step ticks follow from that (auto
// ticks), and any step can also be ticked or unticked by hand.

import { useSyncExternalStore } from 'react';
import type { Lesson } from './content/types.ts';
import { lessonKey } from './content/types.ts';
import { readStrict, setSaveFailed, write } from './storage.ts';

export type StepKey = 'overview' | 'vocab' | 'grammar' | 'dialogues' | 'exercises' | 'speaking';
export const STEP_KEYS: StepKey[] = ['overview', 'vocab', 'grammar', 'dialogues', 'exercises', 'speaking'];

export type LessonProgress = {
  /** Ticked steps → when they were ticked. */
  steps: Partial<Record<StepKey, string>>;
  /** Steps unticked by hand: auto ticks leave them alone until their activity is finished again. */
  manualOff: Partial<Record<StepKey, true>>;
  /** Vocabulary parts whose flashcards were finished (milestone 5 adds these words to review). */
  vocabParts: Partial<Record<'1' | '2', string>>;
  /** Grammar point id → when it was marked understood. */
  grammarDone: Record<string, string>;
  /** Dialogue id → when it was read to the end. */
  dialoguesDone: Record<string, string>;
  /** Exercise item id → last answer. */
  exerciseItems: Record<string, { ok: boolean; at: string }>;
  /** Exercise set id → score of the last full run. */
  exerciseSets: Record<string, { score: number; total: number; at: string }>;
  /** When the speaking prompts were last finished. */
  speakingDone?: string;
};

export const emptyProgress = (): LessonProgress => ({
  steps: {},
  manualOff: {},
  vocabParts: {},
  grammarDone: {},
  dialoguesDone: {},
  exerciseItems: {},
  exerciseSets: {},
});

/** Which steps the lesson's own activity has finished. Overview has no activity: it is ticked by hand. */
export function finishedSteps(lesson: Lesson, p: LessonProgress): Set<StepKey> {
  const done = new Set<StepKey>();
  const parts = new Set(lesson.vocab.map((v) => String(v.part) as '1' | '2'));
  if ([...parts].every((part) => p.vocabParts[part])) done.add('vocab');
  if (lesson.grammar.every((g) => p.grammarDone[g.id])) done.add('grammar');
  if (lesson.dialogues.every((d) => p.dialoguesDone[d.id])) done.add('dialogues');
  if (lesson.exercises.every((e) => p.exerciseSets[e.id])) done.add('exercises');
  if (p.speakingDone) done.add('speaking');
  return done;
}

/** Ticks every step whose activity is finished, unless it was unticked by hand. */
export function applyAutoTicks(lesson: Lesson, p: LessonProgress, now: string): LessonProgress {
  const steps = { ...p.steps };
  for (const step of finishedSteps(lesson, p)) {
    if (!steps[step] && !p.manualOff[step]) steps[step] = now;
  }
  return { ...p, steps };
}

/** 0-1: the share of the six steps that are ticked. */
export const completion = (p: LessonProgress) => STEP_KEYS.filter((s) => p.steps[s]).length / STEP_KEYS.length;
export const isLessonComplete = (p: LessonProgress) => completion(p) === 1;

// ---- store ----

const storageKey = (lesson: Pick<Lesson, 'level' | 'id'>) => `progress.${lessonKey(lesson)}`;
const cache = new Map<string, LessonProgress>();
const loading = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
const EMPTY = emptyProgress();

const notify = () => listeners.forEach((l) => l());
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Loads a lesson's saved progress into the cache (once). */
export function loadProgress(lesson: Pick<Lesson, 'level' | 'id'>): Promise<void> {
  const key = storageKey(lesson);
  if (cache.has(key)) return Promise.resolve();
  let pending = loading.get(key);
  if (!pending) {
    pending = readStrict<LessonProgress | null>(key, null).then(
      (saved) => {
        // Spread over an empty record so records saved by older builds gain any new fields.
        cache.set(key, { ...emptyProgress(), ...saved });
        notify();
      },
      (err) => {
        // Not cached, so nothing is saved over the real record; the next use tries again.
        loading.delete(key);
        throw err;
      },
    );
    loading.set(key, pending);
  }
  return pending;
}

/** Applies a change, re-derives the auto ticks, saves to IndexedDB and updates every screen. */
export async function updateProgress(lesson: Lesson, change: (p: LessonProgress) => LessonProgress): Promise<void> {
  try {
    await loadProgress(lesson);
  } catch (err) {
    // Without the saved record a write would replace it, so this change is not saved.
    console.warn('Could not load progress', err);
    setSaveFailed(true);
    return;
  }
  const key = storageKey(lesson);
  const next = applyAutoTicks(lesson, change(cache.get(key) ?? emptyProgress()), new Date().toISOString());
  cache.set(key, next);
  notify();
  await write(key, next);
}

/** Current progress of one lesson (empty until loaded) and whether it has loaded. */
export function useLessonProgress(lesson: Pick<Lesson, 'level' | 'id'>): { progress: LessonProgress; loaded: boolean } {
  const key = storageKey(lesson);
  const progress = useSyncExternalStore(subscribe, () => cache.get(key) ?? EMPTY);
  if (!cache.has(key)) loadProgress(lesson).catch((err) => console.warn('Could not load progress', err));
  return { progress, loaded: cache.has(key) };
}

// ---- common changes, so every screen records things the same way ----

const now = () => new Date().toISOString();

/** Finishing a step's activity again lifts a manual untick, so the step can tick itself again. */
export const allowAuto = (p: LessonProgress, step: StepKey): LessonProgress => {
  if (!p.manualOff[step]) return p;
  const manualOff = { ...p.manualOff };
  delete manualOff[step];
  return { ...p, manualOff };
};

export const setStepTicked = (lesson: Lesson, step: StepKey, ticked: boolean) =>
  updateProgress(lesson, (p) => {
    const steps = { ...p.steps };
    const manualOff = { ...p.manualOff };
    if (ticked) {
      steps[step] = now();
      delete manualOff[step];
    } else {
      delete steps[step];
      manualOff[step] = true;
    }
    return { ...p, steps, manualOff };
  });

export const markVocabPartDone = (lesson: Lesson, part: 1 | 2) =>
  updateProgress(lesson, (p) => ({ ...allowAuto(p, 'vocab'), vocabParts: { ...p.vocabParts, [String(part)]: now() } }));

export const markGrammarDone = (lesson: Lesson, grammarId: string, done = true) =>
  updateProgress(lesson, (p) => {
    const grammarDone = { ...p.grammarDone };
    if (done) grammarDone[grammarId] = now();
    else delete grammarDone[grammarId];
    return { ...(done ? allowAuto(p, 'grammar') : p), grammarDone };
  });

export const markDialogueDone = (lesson: Lesson, dialogueId: string) =>
  updateProgress(lesson, (p) => ({ ...allowAuto(p, 'dialogues'), dialoguesDone: { ...p.dialoguesDone, [dialogueId]: now() } }));

/** Call on every answer, not only at the end of a set. */
export const recordExerciseAnswer = (lesson: Lesson, itemId: string, ok: boolean) =>
  updateProgress(lesson, (p) => ({ ...p, exerciseItems: { ...p.exerciseItems, [itemId]: { ok, at: now() } } }));

export const recordExerciseSet = (lesson: Lesson, setId: string, score: number, total: number) =>
  updateProgress(lesson, (p) => ({ ...allowAuto(p, 'exercises'), exerciseSets: { ...p.exerciseSets, [setId]: { score, total, at: now() } } }));

export const markSpeakingDone = (lesson: Lesson) => updateProgress(lesson, (p) => ({ ...allowAuto(p, 'speaking'), speakingDone: now() }));

// ---- activity log: how long each finished unit took (the study plan in PLAN.md 9.1 learns from it) ----

export type ActivityKind = 'vocab-part' | 'grammar' | 'dialogue' | 'exercise-set' | 'speaking' | 'book';
/**
 * `repeat`: the same unit was logged before (a re-read, "go again", a toggle off and on). The study
 * plan's time estimates should use first runs only, and ignore entries under a few seconds (for
 * example several grammar points marked in a row).
 */
export type Activity = { at: string; lesson: string; kind: ActivityKind; ref: string; ms: number; count?: number; repeat?: true };

const ACTIVITY_KEY = 'activity.log';
let activityQueue = Promise.resolve();

/**
 * Records one finished unit and its active time. Pass `count` for units whose
 * size varies (e.g. number of words in a flashcard part). Durations over
 * 30 minutes are capped, since the app was probably left open.
 */
export function logActivity(lesson: Pick<Lesson, 'level' | 'id'>, kind: ActivityKind, ref: string, ms: number, count?: number): Promise<void> {
  const entry: Activity = { at: now(), lesson: lessonKey(lesson), kind, ref, ms: Math.min(Math.max(0, Math.round(ms)), 30 * 60_000) };
  if (count !== undefined) entry.count = count;
  activityQueue = activityQueue
    .then(async () => {
      // A failed read throws here, so the log is never replaced by a one-entry list.
      const log = await readStrict<Activity[]>(ACTIVITY_KEY, []);
      if (log.some((a) => a.lesson === entry.lesson && a.kind === entry.kind && a.ref === entry.ref)) entry.repeat = true;
      log.push(entry);
      await write(ACTIVITY_KEY, log);
    })
    .catch((err) => console.warn('Could not log activity', err));
  return activityQueue;
}

export const loadActivityLog = () => readStrict<Activity[]>(ACTIVITY_KEY, []);
