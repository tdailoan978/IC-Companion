import { THEME_CHOICES } from '../lib/theme.ts';
import { useThemeChoice } from './useThemeChoice.ts';

/** Auto / Light / Dark segmented control for the header. */
export function ThemeControl() {
  const [choice, setChoice] = useThemeChoice();
  return (
    <div className="theme-control" role="group" aria-label="Appearance">
      {THEME_CHOICES.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={choice === option.value}
          className="theme-option"
          onClick={() => setChoice(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
