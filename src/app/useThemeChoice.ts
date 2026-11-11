import { useSyncExternalStore } from 'react';
import { loadThemeChoice, saveThemeChoice } from '../lib/storage.ts';
import { applyTheme, isThemeChoice, type ThemeChoice } from '../lib/theme.ts';

// One shared theme choice for every control (the header switch and Settings),
// so changing it in one place updates the other.

/** What index.html's inline script already applied, so controls are right on first render. */
function initialChoice(): ThemeChoice {
  const attr = document.documentElement.dataset.theme;
  return isThemeChoice(attr) ? attr : 'system';
}

let current: ThemeChoice | null = null;
// A tap that lands before the saved choice has loaded wins over the late load.
let chosen = false;
let loadStarted = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loadStarted) {
    loadStarted = true;
    void loadThemeChoice().then((saved) => {
      if (chosen || !isThemeChoice(saved)) return;
      current = saved;
      applyTheme(saved);
      notify();
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

const getChoice = () => (current ??= initialChoice());

export function setThemeChoice(next: ThemeChoice): void {
  chosen = true;
  current = next;
  applyTheme(next);
  notify();
  void saveThemeChoice(next);
}

/** The saved theme choice (IndexedDB is the source of truth) and a setter shared by every control. */
export function useThemeChoice(): [ThemeChoice, (choice: ThemeChoice) => void] {
  return [useSyncExternalStore(subscribe, getChoice), setThemeChoice];
}
