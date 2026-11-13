import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MixedText } from '../../app/MixedText.tsx';
import { hasInk } from '../../lib/ink.ts';
import { noteKey } from '../../lib/notes.ts';
import { inkDataUrls } from './InkImage.tsx';
import { itemLabel, lessonName, shortDate, type LessonGroup } from './noteItems.ts';

/** On <html> while a print view is mounted: the print CSS then prints it instead of the app. */
const PRINTING_CLASS = 'nb-printing';

/**
 * Print / Save as PDF (docs/NOTES_AND_DEEP_LINKS.md section 3): every chosen note written out
 * in full, outside the app (a direct child of <body>, hidden on screen), then window.print().
 * On the iPad that gives Print → Save to Files as PDF.
 *
 * RISK TO TEST ON THE iPAD: window.print() from the Home Screen (standalone) app. If it does
 * nothing there, the fallback is a small PDF library, which needs the owner's OK first.
 * iPad Safari may also not fire `afterprint`; the view is then removed when the Notebook closes
 * or the next print starts (it is never visible on screen either way).
 */
export function PrintView({ title, groups, onDone }: { title: string; groups: LessonGroup[]; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  // Ink as images at 2×, so it prints sharply (canvas elements can print blank or soft).
  const images = useMemo(() => {
    const out = new Map<string, ReturnType<typeof inkDataUrls>>();
    for (const g of groups) for (const n of g.notes) if (hasInk(n.ink)) out.set(noteKey(n), inkDataUrls(n.ink, 2));
    return out;
  }, [groups]);

  // The Notebook renders this view with flushSync and then calls window.print() inside the same tap
  // (WebKit may block a print started later). A layout effect, so the class is on before that call.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add(PRINTING_CLASS);
    return () => html.classList.remove(PRINTING_CLASS);
  }, []);
  useEffect(() => {
    const after = () => done.current();
    window.addEventListener('afterprint', after);
    return () => window.removeEventListener('afterprint', after);
  }, []);

  const printed = shortDate(new Date().toISOString());

  return createPortal(
    <div className="nb-print" ref={root} aria-hidden="true">
      <header className="nb-print-head">
        <h1>
          <MixedText text={title} />
        </h1>
        <p>IC Companion · printed {printed}</p>
      </header>
      {groups.map((g) => (
        <section key={g.key} className="nb-print-lesson">
          <h2>
            {lessonName(g.lesson, { lessonId: g.key })}
            {g.lesson && (
              <>
                {' · '}
                <span lang="zh-Hans">{g.lesson.titleZh}</span> {g.lesson.titleEn}
              </>
            )}
          </h2>
          {g.notes.map((n) => {
            const label = itemLabel(n, g.lesson);
            const slices = images.get(noteKey(n)) ?? [];
            return (
              <article key={noteKey(n)} className="nb-print-note">
                <h3>
                  {label.zh && (
                    <>
                      <span lang="zh-Hans">{label.zh}</span> {label.pinyin} ·{' '}
                    </>
                  )}
                  <MixedText text={label.text} />
                </h3>
                <p className="nb-print-meta">
                  {[lessonName(g.lesson, n), label.pages, `edited ${shortDate(n.edited)}`].filter(Boolean).join(' · ')}
                </p>
                {slices.map((img, i) => (
                  <img key={i} className="nb-print-ink" src={img.src} alt={i === 0 ? 'Handwritten notes' : ''} style={{ width: img.width }} />
                ))}
                {n.text.trim() && (
                  <p className="nb-print-text">
                    <MixedText text={n.text} />
                  </p>
                )}
              </article>
            );
          })}
        </section>
      ))}
    </div>,
    document.body,
  );
}
