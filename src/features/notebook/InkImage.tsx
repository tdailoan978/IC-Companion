import { useEffect, useRef } from 'react';
import { drawInk, inkBottom, type Ink } from '../../lib/ink.ts';

/** Space kept round the ink when it is cropped, in ink pixels. */
const PAD = 12;
/** iPad Safari refuses canvases above about 16.7 million pixels; stay under it. */
const MAX_PIXELS = 16_000_000;

/** The ink's drawn size: its area's width (or how far right the ink reaches), cropped to the lowest ink. */
export function inkExtent(ink: Ink): { width: number; height: number } {
  const right = ink.strokes.reduce((m, s) => s.points.reduce((n, p) => Math.max(n, p.x + s.width), m), 0);
  return { width: Math.max(1, ink.width > 0 ? ink.width : right + PAD), height: Math.max(1, inkBottom(ink) + PAD) };
}

/** Pixel ratio for a w×h CSS-pixel canvas: `wanted`, lowered if the bitmap would be too big. */
const safeRatio = (w: number, h: number, wanted: number) => Math.min(wanted, Math.sqrt(MAX_PIXELS / Math.max(1, w * h)));

/**
 * Ink drawn on the light "paper" colour (the paper is the CSS background, see notebook.css).
 * With `width`, it is drawn that wide (thumbnails); without, at the width it was written and
 * shrunk by CSS to fit. `maxHeight` crops the bottom (thumbnails show the top of the page).
 */
export function InkCanvas({ ink, width, maxHeight, className }: { ink: Ink; width?: number; maxHeight?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const ext = inkExtent(ink);
  const cssW = width ?? ext.width;
  const scale = cssW / ext.width;
  const cssH = Math.min(ext.height * scale, maxHeight ?? Infinity);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = safeRatio(cssW, cssH, Math.max(2, window.devicePixelRatio || 1));
    canvas.width = Math.round(cssW * ratio);
    canvas.height = Math.round(cssH * ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawInk(ctx, ink, scale);
  }, [ink, cssW, cssH, scale]);

  return (
    <canvas
      ref={ref}
      className={`ink-canvas${className ? ` ${className}` : ''}`}
      style={width ? { width: cssW, height: cssH } : { width: '100%', maxWidth: cssW, aspectRatio: `${cssW} / ${cssH}` }}
      role="img"
      aria-label="Handwritten notes"
    />
  );
}

/** The ink as a PNG data URL at `ratio`× its size (2× prints sharply), with its CSS size. */
/** Height of one printed ink slice in CSS px: an image can't break across pages, so tall ink is cut. */
export const PRINT_SLICE_HEIGHT = 900;

/** The ink as PNG data URLs, one per slice of at most `sliceHeight` CSS px, top to bottom. */
export function inkDataUrls(ink: Ink, ratio = 2, sliceHeight = PRINT_SLICE_HEIGHT): { src: string; width: number; height: number }[] {
  const { width, height } = inkExtent(ink);
  const out: { src: string; width: number; height: number }[] = [];
  for (let top = 0; top < height; top += sliceHeight) {
    const h = Math.min(sliceHeight, height - top);
    const r = safeRatio(width, h, ratio);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * r);
    canvas.height = Math.round(h * r);
    const ctx = canvas.getContext('2d');
    if (!ctx) break;
    ctx.translate(0, -top * r);
    drawInk(ctx, ink, r);
    out.push({ src: canvas.toDataURL('image/png'), width, height: h });
  }
  return out;
}
