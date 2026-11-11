// Deterministic shuffles: the same seed always gives the same order, so tiles
// and options never jump on a re-render, and tests can pin the result.

/** FNV-1a hash of a string to a 32-bit seed. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small seeded random generator returning numbers in [0, 1). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Fisher-Yates shuffle driven by the seed. Returns a new array. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const next = random(hashSeed(seed));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Shuffles until `isBad` is false (e.g. "this is the correct order"). Tries a
 * series of derived seeds, then every rotation; if no acceptable order exists
 * (one item, or all items alike) it returns the plain shuffle.
 */
export function shuffleAvoiding<T>(items: readonly T[], seed: string, isBad: (order: T[]) => boolean): T[] {
  const first = seededShuffle(items, seed);
  if (!isBad(first)) return first;
  for (let attempt = 1; attempt < 20; attempt++) {
    const order = seededShuffle(items, `${seed}#${attempt}`);
    if (!isBad(order)) return order;
  }
  for (let r = 1; r < items.length; r++) {
    const order = [...first.slice(r), ...first.slice(0, r)];
    if (!isBad(order)) return order;
  }
  return first;
}

/** The indexes 0..n-1 in a seeded order that differs from 0..n-1 whenever n > 1. */
export function shuffledIndexes(n: number, seed: string): number[] {
  const indexes = Array.from({ length: n }, (_, i) => i);
  return shuffleAvoiding(indexes, seed, (order) => order.every((v, i) => v === i));
}
