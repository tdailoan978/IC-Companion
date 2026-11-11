import { MixedText } from '../../app/MixedText.tsx';
import type { WeekDay } from '../../lib/plan/week.ts';
import { dayLabel, type PlanModel } from './usePlan.ts';
import { allLessons } from '../../lib/content/lessons.ts';
import { lessonKey } from '../../lib/content/types.ts';

const lessonByKey = new Map(allLessons.map((l) => [lessonKey(l), l]));

function Milestones({ keys }: { keys: string[] }) {
  if (keys.length === 0) return null;
  return (
    <ul className="plan-milestones">
      {keys.map((key) => {
        const l = lessonByKey.get(key);
        return (
          <li key={key} className="plan-milestone">
            <span aria-hidden="true">★ </span>
            Lesson {l?.lesson ?? key} complete
            {l && (
              <>
                {' '}
                <span lang="zh-Hans">{l.titleZh}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function minutesLine(d: WeekDay): string {
  if (d.when === 'past') return d.measuredMin > 0 || d.plannedMin > 0 ? `Done ~${d.plannedMin} min · measured ${d.measuredMin} min` : 'Nothing logged';
  if (d.when === 'today') return `Planned ~${d.plannedMin} min · measured ${d.measuredMin} min`;
  return `Planned ~${d.plannedMin} min`;
}

function DayCard({ d, today }: { d: WeekDay; today: string }) {
  const empty = d.items.length === 0 && d.reviewMin === 0;
  return (
    <li className="plan-day" data-when={d.when} aria-current={d.when === 'today' ? 'date' : undefined}>
      <h3 className="plan-day-head">
        {dayLabel(d.day, today)}
        {d.when === 'today' && <span className="plan-day-tag">Today</span>}
      </h3>
      {!d.study && empty ? (
        <p className="plan-day-mins">Rest day</p>
      ) : (
        <p className="plan-day-mins">{minutesLine(d)}</p>
      )}
      <Milestones keys={d.completed} />
      {!empty && (
        <ul className="plan-day-items">
          {d.reviewMin > 0 && (
            <li data-done={d.when === 'past'}>
              <span className="plan-day-tick" aria-hidden="true">
                {d.when === 'past' ? '✓' : '○'}
              </span>
              Review · {d.reviewMin} min
            </li>
          )}
          {d.items.map((it) => (
            <li key={it.task.id} data-done={it.done}>
              <span className="plan-day-tick" aria-hidden="true">
                {it.done ? '✓' : '○'}
              </span>
              <span className="visually-hidden">{it.done ? 'Done: ' : 'Planned: '}</span>
              <span>
                L{it.task.lessonNo} · <MixedText text={it.task.label} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function WeekView({ plan }: { plan: PlanModel }) {
  const { week, nextWeek, today } = plan;
  return (
    <section className="plan-section" aria-labelledby="plan-week">
      <h2 id="plan-week">This week</h2>
      <ol className="plan-week">
        {week.map((d) => (
          <DayCard key={d.day} d={d} today={today} />
        ))}
      </ol>

      <h3 className="plan-subhead">Next week</h3>
      <ul className="plan-next-week">
        {nextWeek.map((d) => {
          const lessons = [...new Set(d.items.map((i) => i.task.lessonNo))];
          return (
            <li key={d.day} data-study={d.study}>
              <span className="plan-next-day">{dayLabel(d.day, today)}</span>
              <span className="plan-next-what">
                {d.items.length === 0
                  ? d.study
                    ? 'Review only'
                    : 'Rest day'
                  : `${d.items.length} ${d.items.length === 1 ? 'task' : 'tasks'} · ~${d.plannedMin} min · Lesson ${lessons.join(', ')}`}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Completed lessons, per volume. */
export function MilestoneSummary({ plan }: { plan: PlanModel }) {
  const volumes = new Map<string, { total: number; done: { key: string; day: string }[] }>();
  for (const l of allLessons) {
    const name = /Volume \d+/.exec(l.book)?.[0] ?? `Level ${l.level}`;
    const v = volumes.get(name) ?? { total: 0, done: [] };
    v.total++;
    const day = plan.completions.get(lessonKey(l));
    if (day) v.done.push({ key: lessonKey(l), day });
    volumes.set(name, v);
  }
  return (
    <section className="plan-section" aria-labelledby="plan-milestones">
      <h2 id="plan-milestones">Milestones</h2>
      {[...volumes].map(([name, v]) => (
        <div key={name}>
          <p className="plan-volume">
            <strong>{name}:</strong> {v.done.length} of {v.total} lessons complete
            {v.done.length === v.total && ' · volume finished'}
          </p>
          <div
            className="plan-volume-bar"
            role="progressbar"
            aria-label={`${name} lessons complete`}
            aria-valuemin={0}
            aria-valuemax={v.total}
            aria-valuenow={v.done.length}
          >
            <span style={{ width: `${(100 * v.done.length) / Math.max(1, v.total)}%` }} />
          </div>
          {v.done.length > 0 && (
            <ul className="plan-milestones">
              {v.done.map(({ key, day }) => {
                const l = lessonByKey.get(key)!;
                return (
                  <li key={key} className="plan-milestone">
                    <span aria-hidden="true">★ </span>
                    Lesson {l.lesson} <span lang="zh-Hans">{l.titleZh}</span> · {dayLabel(day, plan.today)}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
