import { useId, type ReactNode } from 'react';

/** A titled group of settings. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="settings-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      <div className="settings-card">{children}</div>
    </section>
  );
}

type Option<T extends string> = { value: T; label: string };

/** One choice out of a few, as a row of buttons (like the header's theme switch). */
export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  options: readonly Option<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="setting">
      <div className="setting-text">
        <span id={`${id}-label`} className="setting-label">
          {label}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="setting-hint">
            {hint}
          </span>
        )}
      </div>
      <div
        className="segmented"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="segmented-option"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An on/off switch; tapping the label works too. */
export function Switch({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="setting">
      <div className="setting-text">
        <label htmlFor={id} className="setting-label">
          {label}
        </label>
        {hint && (
          <span id={`${id}-hint`} className="setting-hint">
            {hint}
          </span>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => onChange(!on)}
      >
        <span className="switch-thumb" aria-hidden="true" />
        <span className="switch-state" aria-hidden="true">
          {on ? 'On' : 'Off'}
        </span>
      </button>
    </div>
  );
}

/** A number with − and + buttons, kept between min and max. */
export function Stepper({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  hint?: ReactNode;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="setting">
      <div className="setting-text">
        <span id={`${id}-label`} className="setting-label">
          {label}
        </span>
        {hint && (
          <span id={`${id}-hint`} className="setting-hint">
            {hint}
          </span>
        )}
      </div>
      <div
        className="stepper"
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        <button
          type="button"
          className="stepper-button"
          aria-label={`Decrease to ${clamp(value - step)}`}
          disabled={value <= min}
          onClick={() => onChange(clamp(value - step))}
        >
          −
        </button>
        <output className="stepper-value" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className="stepper-button"
          aria-label={`Increase to ${clamp(value + step)}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}
