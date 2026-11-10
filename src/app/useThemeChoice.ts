import { useCallback, useEffect, useRef, useState } from 'react';
import { loadThemeChoice, saveThemeChoice } from '../lib/storage.ts';
import { applyTheme, isThemeChoice, type ThemeChoice } from '../lib/theme.ts';

/** What index.html's inline script already applied, so the control is right on first render. */
function initialChoice(): ThemeChoice {
  const attr = document.documentElement.dataset.theme;
  return isThemeChoice(attr) ? attr : 'system';
}

/** The saved theme choice (IndexedDB is the source of truth) and a setter. */
export function useThemeChoice(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const [choice, setChoice] = useState<ThemeChoice>(initialChoice);
  // A tap that lands before the saved choice has loaded wins over the late load.
  const chosen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadThemeChoice().then((saved) => {
      if (cancelled || chosen.current || !isThemeChoice(saved)) return;
      setChoice(saved);
      applyTheme(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((next: ThemeChoice) => {
    chosen.current = true;
    setChoice(next);
    applyTheme(next);
    void saveThemeChoice(next);
  }, []);

  return [choice, update];
}
