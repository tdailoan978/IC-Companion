/**
 * Scrolls an item to the top of its scrolling area (minus its CSS scroll-margin-top, which clears the
 * sticky bars) and moves focus to it, or to `focus` (null: leave focus alone). Only the nearest
 * scrolling box moves: the page itself never scrolls, so the header stays put (scrollIntoView would
 * also scroll the document).
 */
export function revealHeading(el: HTMLElement, focus: HTMLElement | null = el): void {
  let box = el.parentElement;
  while (box && !/(auto|scroll)/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
  if (box) {
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - margin;
  } else {
    el.scrollIntoView({ block: 'start' });
  }
  focus?.focus({ preventScroll: true });
}
