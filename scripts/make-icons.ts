// Draws the app icon (文 in white on a red square) and writes the PNGs in
// public/icons/. Node built-ins only: the glyph is a set of vector strokes,
// filled as polygons with a supersampled scanline rasteriser, and the PNG
// files are assembled by hand (signature, IHDR, IDAT, IEND, CRC32).
//
// Run with: npm run icons

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type Pt = { x: number; y: number };
type Polygon = Pt[];
type RGB = [number, number, number];

const RED: RGB = [0xc6, 0x28, 0x28];
const WHITE: RGB = [0xff, 0xff, 0xff];
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

// ---------------------------------------------------------------- glyph ---
// Strokes are centre lines in a 1000-unit box (y down) with a width at each
// end. Widths are interpolated along the stroke; both ends get round caps.

type Stroke = { path: Pt[]; w0: number; w1: number; wMid?: number };

const p = (x: number, y: number): Pt => ({ x, y });

function bezier(a: Pt, b: Pt, c: Pt, d: Pt, steps = 48): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push({
      x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
    });
  }
  return out;
}

const STROKES: Stroke[] = [
  // 点: short dot leaning slightly right, heavier at the bottom
  { path: bezier(p(486, 62), p(494, 92), p(503, 122), p(514, 152), 16), w0: 100, w1: 116 },
  // 横: the long horizontal
  { path: [p(130, 305), p(870, 305)], w0: 106, w1: 106 },
  // 撇: from under the right of the horizontal, sweeping down to the lower left
  { path: bezier(p(680, 350), p(645, 640), p(440, 860), p(130, 940)), w0: 112, w1: 82, wMid: 106 },
  // 捺: from under the left of the horizontal, sweeping down to the lower right
  { path: bezier(p(318, 350), p(375, 640), p(600, 865), p(880, 930)), w0: 102, w1: 120, wMid: 106 },
];

function widthAt(s: Stroke, t: number): number {
  if (s.wMid === undefined) return s.w0 + (s.w1 - s.w0) * t;
  return t < 0.5 ? s.w0 + (s.wMid - s.w0) * (t / 0.5) : s.wMid + (s.w1 - s.wMid) * ((t - 0.5) / 0.5);
}

/** Outline of one stroke: left edge, end cap, right edge back, start cap. */
function strokeOutline(s: Stroke): Polygon {
  const pts = s.path;
  const n = pts.length;
  const normals: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }
  const half = (i: number) => widthAt(s, n === 1 ? 0 : i / (n - 1)) / 2;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const r = half(i);
    left.push({ x: pts[i].x + normals[i].x * r, y: pts[i].y + normals[i].y * r });
    right.push({ x: pts[i].x - normals[i].x * r, y: pts[i].y - normals[i].y * r });
  }
  const cap = (c: Pt, from: number, r: number): Pt[] => {
    const out: Pt[] = [];
    const steps = 20;
    for (let k = 1; k < steps; k++) {
      const a = from - (Math.PI * k) / steps;
      out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
    return out;
  };
  const endAngle = Math.atan2(normals[n - 1].y, normals[n - 1].x);
  const startAngle = Math.atan2(normals[0].y, normals[0].x) - Math.PI;
  return [
    ...left,
    ...cap(pts[n - 1], endAngle, half(n - 1)),
    ...right.reverse(),
    ...cap(pts[0], startAngle, half(0)),
  ];
}

function signedArea(poly: Polygon): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    a += p1.x * p2.y - p2.x * p1.y;
  }
  return a / 2;
}

/** All strokes as polygons with the same winding, so nonzero fill unions them. */
function glyphPolygons(): Polygon[] {
  return STROKES.map(strokeOutline).map((poly) => (signedArea(poly) < 0 ? poly.reverse() : poly));
}

// ----------------------------------------------------------- rasterise ---

/**
 * Coverage (0-1) per pixel using nonzero winding. Each pixel row is sampled at
 * SS sub-rows; along a sub-row the span coverage is exact.
 */
function rasterise(polys: Polygon[], size: number, ss = 16): Float32Array {
  const cov = new Float32Array(size * size);
  type Edge = { x0: number; y0: number; x1: number; y1: number; dir: number };
  const edges: Edge[] = [];
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (a.y === b.y) continue;
      edges.push(a.y < b.y ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y, dir: 1 } : { x0: b.x, y0: b.y, x1: a.x, y1: a.y, dir: -1 });
    }
  }
  const hits: { x: number; dir: number }[] = [];
  for (let row = 0; row < size; row++) {
    for (let s = 0; s < ss; s++) {
      const y = row + (s + 0.5) / ss;
      hits.length = 0;
      for (const e of edges) {
        if (y < e.y0 || y >= e.y1) continue;
        hits.push({ x: e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0), dir: e.dir });
      }
      hits.sort((a, b) => a.x - b.x);
      let winding = 0;
      for (let i = 0; i < hits.length; i++) {
        const before = winding;
        winding += hits[i].dir;
        if (before !== 0 || winding === 0 || i + 1 >= hits.length) continue;
        // Span opens here; find where the winding returns to zero.
        let j = i + 1;
        let w = winding;
        for (; j < hits.length; j++) {
          w += hits[j].dir;
          if (w === 0) break;
        }
        addSpan(cov, row * size, size, hits[i].x, hits[Math.min(j, hits.length - 1)].x, 1 / ss);
        winding = 0;
        i = j;
      }
    }
  }
  return cov;
}

function addSpan(cov: Float32Array, rowStart: number, size: number, xa: number, xb: number, weight: number) {
  xa = Math.max(0, xa);
  xb = Math.min(size, xb);
  if (xb <= xa) return;
  for (let px = Math.floor(xa); px < Math.ceil(xb); px++) {
    const overlap = Math.min(xb, px + 1) - Math.max(xa, px);
    if (overlap > 0) cov[rowStart + px] += overlap * weight;
  }
}

// --------------------------------------------------------------- layout ---

function bounds(polys: Polygon[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polys) {
    for (const q of poly) {
      minX = Math.min(minX, q.x); maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y); maxY = Math.max(maxY, q.y);
    }
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * Places the glyph centred in a size×size icon. `glyphFraction` is the share
 * of the icon taken by the glyph's larger dimension; `maxRadius` (a share of
 * the icon) optionally caps the distance of any glyph point from the centre,
 * which keeps a maskable icon inside its circular safe zone.
 */
function placeGlyph(size: number, glyphFraction: number, maxRadius?: number): Polygon[] {
  const polys = glyphPolygons();
  const b = bounds(polys);
  let scale = (glyphFraction * size) / Math.max(b.maxX - b.minX, b.maxY - b.minY);
  if (maxRadius !== undefined) {
    let far = 0;
    for (const poly of polys) for (const q of poly) far = Math.max(far, Math.hypot(q.x - b.cx, q.y - b.cy));
    scale = Math.min(scale, (maxRadius * size) / far);
  }
  // Optical centring: nudge the glyph down a touch, its visual mass sits low.
  const offsetY = size * 0.005;
  return polys.map((poly) =>
    poly.map((q) => ({ x: size / 2 + (q.x - b.cx) * scale, y: size / 2 + offsetY + (q.y - b.cy) * scale })),
  );
}

// ------------------------------------------------------------------ png ---

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (v: number) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
};

/** RGB rows (colour type 2, no alpha) with a filter byte in front of each. */
function compose(cov: Float32Array, size: number): Buffer {
  const bg = RED.map(toLinear);
  const fg = WHITE.map(toLinear);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const a = Math.min(1, cov[y * size + x]);
      for (let c = 0; c < 3; c++) raw[o++] = toSrgb(bg[c] + (fg[c] - bg[c]) * a);
    }
  }
  return raw;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, rawRows: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rawRows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------- main ---

const ICONS: { file: string; size: number; glyph: number; maxRadius?: number }[] = [
  { file: 'icon-192.png', size: 192, glyph: 0.64 },
  { file: 'icon-512.png', size: 512, glyph: 0.64 },
  { file: 'apple-touch-icon.png', size: 180, glyph: 0.64 },
  // Maskable: everything inside the central 80% circle (radius 40%), with margin.
  { file: 'icon-maskable-512.png', size: 512, glyph: 0.64, maxRadius: 0.36 },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const icon of ICONS) {
  const polys = placeGlyph(icon.size, icon.glyph, icon.maxRadius);
  const png = encodePng(icon.size, compose(rasterise(polys, icon.size), icon.size));
  writeFileSync(join(OUT_DIR, icon.file), png);
  console.log(`wrote public/icons/${icon.file} (${icon.size}×${icon.size}, ${png.length} bytes)`);
}
