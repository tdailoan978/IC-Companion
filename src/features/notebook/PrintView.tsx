import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MixedText } from '../../app/MixedText.tsx';
import { hasInk } from '../../lib/ink.ts';
import { noteKey } from '../../lib/notes.ts';
import { inkDataUrl } from './InkImage.tsx';
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
    const out = new Map<string, ReturnType<typeof inkDataUrl>>();
    for (const g of groups) for (const n of g.notes) if (hasInk(n.ink)) out.set(noteKey(n), inkDataUrl(n.ink, 2));
    return out;
  }, [groups]);

  useEffect(() => {
    let cancelled = false;
    const html = document.documentElement;
    html.classList.add(PRINTING_CLASS);
    const after = () => done.current();
    window.addEventListener('afterprint', after);
    const imgs = [...(root.current?.querySelectorAll('img') ?? [])];
    void Promise.all(imgs.map((img) => img.decode().catch(() => undefined))).then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', after);
      html.classList.remove(PRINTING_CLASS);
    };
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
            const img = images.get(noteKey(n));
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
                {img && <img src={img.src} alt="Handwritten notes" style={{ width: img.width }} />}
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
