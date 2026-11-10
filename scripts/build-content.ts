// Parses content/level-*/L*.md into src/generated/lessons.json.
// Run with `npm run build:content` (Node's built-in type stripping, no build step).
// Any contract break fails the run with every problem listed as `file:line: message`.

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ContentError, formatIssue, parseLesson } from '../src/lib/content/parse.ts';
import type { ContentIssue } from '../src/lib/content/parse.ts';
import { lessonKey } from '../src/lib/content/types.ts';
import type { Lesson, LessonBundle } from '../src/lib/content/types.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'content');
const outFile = join(root, 'src', 'generated', 'lessons.json');

const issues: ContentIssue[] = [];
const lessons: { lesson: Lesson; file: string; text: string }[] = [];

const lineOf = (text: string, key: string): number => {
  const i = text.split(/\r?\n/).findIndex((l) => l.startsWith(`${key}:`));
  return i < 0 ? 1 : i + 1;
};

const levelDirs = readdirSync(contentDir)
  .filter((d) => /^level-\d+$/.test(d) && statSync(join(contentDir, d)).isDirectory())
  .sort();

for (const dir of levelDirs) {
  const dirLevel = Number(dir.slice('level-'.length));
  const files = readdirSync(join(contentDir, dir))
    .filter((f) => f.startsWith('L') && f.endsWith('.md'))
    .sort();
  for (const name of files) {
    const path = join(contentDir, dir, name);
    const file = relative(root, path);
    const text = readFileSync(path, 'utf8');
    try {
      const lesson = parseLesson(text, file);
      if (lesson.level !== dirLevel) {
        issues.push({ file, line: lineOf(text, 'level'), message: `level is ${lesson.level} but the file is in ${dir}/; expected level: ${dirLevel}` });
      }
      if (`${lesson.id}.md` !== name) {
        issues.push({ file, line: lineOf(text, 'id'), message: `id is ${lesson.id} but the file is named ${name}; expected the file name to be ${lesson.id}.md` });
      }
      lessons.push({ lesson, file, text });
    } catch (e) {
      if (e instanceof ContentError) issues.push(...e.issues);
      else throw e;
    }
  }
}

const seen = new Map<string, string>();
for (const { lesson, file, text } of lessons) {
  const key = lessonKey(lesson);
  const other = seen.get(key);
  if (other) issues.push({ file, line: lineOf(text, 'id'), message: `duplicate lesson: level ${lesson.level} id ${lesson.id} is also defined in ${other}` });
  else seen.set(key, file);
}

if (lessons.length === 0 && issues.length === 0) {
  issues.push({ file: relative(root, contentDir), line: 1, message: 'no lesson files found; expected content/level-<n>/L<n>.md' });
}

if (issues.length > 0) {
  for (const i of issues) console.error(formatIssue(i));
  const files = new Set(issues.map((i) => i.file)).size;
  console.error(`\nbuild-content: ${issues.length} problem(s) in ${files} file(s); nothing written.`);
  process.exit(1);
}

const sorted = lessons.map((l) => l.lesson).sort((a, b) => a.level - b.level || a.lesson - b.lesson);
const bundle: LessonBundle = { generatedAt: new Date().toISOString(), lessons: sorted };
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(bundle, null, 2) + '\n');

for (const l of sorted) {
  const p1 = l.vocab.filter((v) => v.part === 1).length;
  const p2 = l.vocab.length - p1;
  const turns = l.dialogues.map((d) => d.turns.length).join('+');
  const sets = l.exercises.map((e) => `${e.type} ${e.items.length}`).join(', ');
  console.log(
    `level ${l.level} ${l.id.padEnd(4)} vocab ${p1}+${p2}=${l.vocab.length}, grammar ${l.grammar.length}, ` +
      `dialogue turns ${turns}, exercises ${sets}, speaking ${l.speaking.length}  (${l.titleEn})`,
  );
}
console.log(`build-content: wrote ${sorted.length} lessons to ${relative(root, outFile)}`);
