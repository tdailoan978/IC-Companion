// PROTOTYPE (throwaway).
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

export const VARIANTS = [
  { key: 'A', label: 'Variant A (Stacked page)' },
  { key: 'B', label: 'Variant B (Bottom toolbar)' },
  { key: 'C', label: 'Variant C (Paper)' },
] as const;

export function PrototypeSwitcher() {
  const [params, setParams] = useSearchParams();
  const idx = Math.max(0, VARIANTS.findIndex((v) => v.key === params.get('variant')));
  const go = (d: number) => {
    const n = VARIANTS[(idx + d + VARIANTS.length) % VARIANTS.length].key;
    setParams({ variant: n }, { replace: true });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <div className="pt-switcher" role="group" aria-label="Prototype variant">
      <button type="button" onClick={() => go(-1)} aria-label="Previous variant">‹</button>
      <span>{VARIANTS[idx].label}</span>
      <button type="button" onClick={() => go(1)} aria-label="Next variant">›</button>
    </div>
  );
}
