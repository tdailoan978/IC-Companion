import type { Lesson } from '../../lib/content/types.ts';
import { MixedText } from '../../app/MixedText.tsx';

export function OverviewStep({ lesson }: { lesson: Lesson }) {
  return (
    <article className="step overview">
      <header className="lesson-title">
        <p className="eyebrow">
          Level {lesson.level} · Lesson {lesson.lesson}
        </p>
        <h1>
          <span lang="zh-Hans" className="lesson-title-zh">
            {lesson.titleZh}
          </span>
          <span className="lesson-title-en">{lesson.titleEn}</span>
        </h1>
        <p className="lesson-book">
          {lesson.book} · pp. {lesson.bookPages}
        </p>
      </header>

      <section aria-labelledby="objectives-heading">
        <h2 id="objectives-heading">Objectives</h2>
        <ul className="objectives">
          {lesson.objectives.map((objective) => (
            <li key={objective}>
              <MixedText text={objective} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="book-heading">
        <h2 id="book-heading">In the book</h2>
        <table className="book-refs">
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Page</th>
            </tr>
          </thead>
          <tbody>
            {lesson.bookRefs.map((ref) => (
              <tr key={ref.section}>
                <th scope="row">{ref.section}</th>
                <td>
                  <span aria-hidden="true">→ </span>p. {ref.page}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </article>
  );
}
