import { useState } from 'react';
import { updateSettings, type Settings } from '../../lib/settings.ts';
import type { Day } from '../../lib/days.ts';
import { dayLabel } from './usePlan.ts';

// Monday first, as in the week view. Values are 0 = Sunday … 6 = Saturday.
const WEEK = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
  { value: 0, short: 'Sun', long: 'Sunday' },
];
export const DAILY_CHOICES = [15, 20, 30, 45, 60];

export function StudyDaysPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <fieldset className="plan-field">
      <legend>Study days</legend>
      <div className="plan-chips">
        {WEEK.map((d) => {
          const on = value.includes(d.value);
          return (
            <button
              key={d.value}
              type="button"
              className="toggle-chip plan-chip"
              aria-pressed={on}
              aria-label={d.long}
              onClick={() => onChange(on ? value.filter((v) => v !== d.value) : [...value, d.value].sort())}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      {value.length === 0 && <p className="plan-field-note">Choose at least one day.</p>}
    </fieldset>
  );
}

export function DailyTimePicker({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const choices = DAILY_CHOICES.includes(value) ? DAILY_CHOICES : [...DAILY_CHOICES, value].sort((a, b) => a - b);
  return (
    <fieldset className="plan-field">
      <legend>Time per study day</legend>
      <div className="plan-chips">
        {choices.map((m) => (
          <button key={m} type="button" className="toggle-chip plan-chip" aria-pressed={value === m} aria-label={`${m} minutes`} onClick={() => onChange(m)}>
            {m} min
          </button>
        ))}
      </div>
      <p className="plan-field-note">The plan never puts more than this on one day.</p>
    </fieldset>
  );
}

/** First use: choose the week shape, then Start. */
export function PlanSetup({ today }: { today: Day }) {
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [cap, setCap] = useState(30);
  return (
    <section className="plan-section plan-setup" aria-labelledby="plan-setup">
      <h2 id="plan-setup">Set up your study plan</h2>
      <p className="muted">
        The plan works through the lessons in order, mixing book reading with the app's steps, and fits each day into the time you choose.
        You can change these later.
      </p>
      <StudyDaysPicker value={days} onChange={setDays} />
      <DailyTimePicker value={cap} onChange={setCap} />
      <button
        type="button"
        className="button plan-start"
        disabled={days.length === 0}
        onClick={() => void updateSettings({ studyDays: days, dailyCapMin: cap, planStart: today })}
      >
        Start the plan today
      </button>
    </section>
  );
}

/** The same controls later, plus my own finish date. */
export function PlanSettingsSection({ settings, today }: { settings: Settings; today: Day }) {
  const [date, setDate] = useState(settings.deadline ?? '');
  return (
    <section className="plan-section" aria-labelledby="plan-settings">
      <h2 id="plan-settings">Plan settings</h2>
      <StudyDaysPicker value={settings.studyDays} onChange={(studyDays) => void updateSettings({ studyDays })} />
      <DailyTimePicker value={settings.dailyCapMin} onChange={(dailyCapMin) => void updateSettings({ dailyCapMin })} />
      <fieldset className="plan-field">
        <legend>Finish date</legend>
        <p className="plan-field-note">
          {settings.deadline ? `Set to ${dayLabel(settings.deadline, today)}.` : 'None set.'}
          {settings.planStart && ` Plan started ${dayLabel(settings.planStart, today)}.`}
        </p>
        <div className="plan-date-row">
          <label className="visually-hidden" htmlFor="plan-deadline">
            Finish date
          </label>
          <input id="plan-deadline" className="plan-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
          <button type="button" className="button" disabled={!date || date === settings.deadline} onClick={() => void updateSettings({ deadline: date })}>
            Save date
          </button>
          {settings.deadline && (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setDate('');
                void updateSettings({ deadline: null });
              }}
            >
              Clear date
            </button>
          )}
        </div>
      </fieldset>
    </section>
  );
}
