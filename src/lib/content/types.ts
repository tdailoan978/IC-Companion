// The lesson data model from PLAN.md section 4. Shared contract between the
// content build (scripts/build-content.ts) and the app. Change only with care:
// item ids are what saved progress is keyed by.

export type Sentence = { zh: string; pinyin: string; en: string };

export type VocabItem = {
  id: string; // e.g. L11.v.12
  part: 1 | 2;
  n: number;
  zh: string;
  pinyin: string;
  pos: string;
  en: string;
};

export type GrammarPoint = {
  id: string; // e.g. L11.g.3
  title: string;
  pattern: string;
  explanationMd: string;
  examples: Sentence[];
  watchOut?: string;
};

export type DialogueTurn = Sentence & { id: string; speaker: string }; // id e.g. L11.d1.4

export type Dialogue = {
  id: string; // e.g. L11.d1
  title: string;
  setting: string;
  turns: DialogueTurn[];
};

export type ExerciseSet =
  | { id: string; type: 'choice'; title: string; items: { id: string; prompt: string; options: string[]; answer: string }[] }
  | { id: string; type: 'order'; title: string; items: { id: string; chunks: string[]; answer: string }[] }
  | { id: string; type: 'translate'; title: string; items: { id: string; en: string; answer: string }[] }
  | { id: string; type: 'match'; title: string; items: { id: string; zh: string; en: string }[] };

export type Lesson = {
  level: number;
  id: string; // e.g. L11, unique within a level
  lesson: number;
  titleEn: string;
  titleZh: string;
  book: string;
  bookPages: string;
  objectives: string[];
  bookRefs: { section: string; page: number }[];
  vocab: VocabItem[];
  grammar: GrammarPoint[];
  dialogues: Dialogue[];
  exercises: ExerciseSet[]; // ids e.g. L11.e2
  speaking: Sentence[];
};

/** The generated bundle written to src/generated/lessons.json. */
export type LessonBundle = { generatedAt: string; lessons: Lesson[] };

/** Lessons are unique by level + id. */
export const lessonKey = (l: Pick<Lesson, 'level' | 'id'>) => `${l.level}/${l.id}`;
