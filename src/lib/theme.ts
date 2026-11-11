// Light / dark theme. The CSS follows prefers-color-scheme unless <html> has
// data-theme="light" or "dark". The choice is stored in IndexedDB (see
// storage.ts) and mirrored to localStorage so the inline script in index.html
// can apply it before the first paint.

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Must match the key read by the inline script in index.html. */
export const THEME_CACHE_KEY = 'ic-theme';

/** Header / status bar colours, kept in step with --header-bg in the CSS. */
const THEME_COLOR = { light: '#b71c1c', dark: '#8b1a1a' } as const;

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;

  // Two theme-color metas (one per scheme). With a manual choice, both
  // carry that theme's colour so the browser chrome matches the page.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light';
    meta.content = THEME_COLOR[choice === 'system' ? scheme : choice];
  }

  try {
    localStorage.setItem(THEME_CACHE_KEY, choice);
  } catch {
    // Not available (private mode); the IndexedDB copy still applies after load.
  }
}
