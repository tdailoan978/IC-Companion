/** A small on/off switch for showing pinyin, English, and the like. */
export function ToggleChip({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className="toggle-chip" aria-pressed={on} onClick={() => onChange(!on)}>
      {label}
    </button>
  );
}
