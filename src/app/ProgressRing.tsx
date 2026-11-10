import type { ReactNode } from 'react';

type Props = {
  /** Progress from 0 to 1. */
  value: number;
  size?: number;
  /** Shown in the middle of the ring, e.g. the lesson number. */
  children?: ReactNode;
};

/** Circular progress indicator. The percentage is announced to screen readers. */
export function ProgressRing({ value, size = 56, children }: Props) {
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <span className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="progress-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        {v > 0 && (
          <circle
            className="progress-ring-value"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - v)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      {children !== undefined && <span className="progress-ring-label">{children}</span>}
      <span className="visually-hidden">{Math.round(v * 100)}% done</span>
    </span>
  );
}
