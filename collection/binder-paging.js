/*
 * Binder paging rules: pure functions, no DOM. The Backlog binder shows the filtered, sorted cards as pages of
 * BINDER_COLUMNS x BINDER_ROWS slots; a window shows BINDER_WIDE_PAGES pages together, or BINDER_NARROW_PAGES
 * on a narrow window. The position is an offset (index of the first card shown), always a multiple of the view size.
 */
const BINDER_COLUMNS = 3;
const BINDER_ROWS = 3;
const BINDER_PAGE_SIZE = BINDER_COLUMNS * BINDER_ROWS; // cards per page
const BINDER_WIDE_PAGES = 2; // pages shown together on a wide window
const BINDER_NARROW_PAGES = 1; // pages shown on a narrow window
const BINDER_NARROW_MAX_PX = 700; // widest window counted as narrow
const BINDER_PREVIOUS = -1; // direction of a page turn back
const BINDER_NEXT = 1; // direction of a page turn forward

/* Cards in one view (all the pages shown together). */
function binderViewSize(pagesPerView) {
  return BINDER_PAGE_SIZE * pagesPerView;
}

/* Number of views needed for `length` cards; at least 1 so an empty list still has a first view. */
function viewCount(length, pagesPerView) {
  return Math.max(1, Math.ceil(length / binderViewSize(pagesPerView)));
}

/* Largest valid offset not above `offset`: aligned to a view start, never past the last view, 0 for no cards. */
function clampOffset(offset, length, pagesPerView) {
  if (length <= 0) return 0;
  const size = binderViewSize(pagesPerView);
  const lastStart = (viewCount(length, pagesPerView) - 1) * size;
  const aligned = Math.floor(Math.max(0, offset) / size) * size;
  return Math.min(aligned, lastStart);
}

/* The offset one view away in `direction` (BINDER_PREVIOUS or BINDER_NEXT), stopping at the first and last view. */
function turn(offset, direction, length, pagesPerView) {
  const current = clampOffset(offset, length, pagesPerView);
  return clampOffset(current + direction * binderViewSize(pagesPerView), length, pagesPerView);
}

/* The pages of the view starting at `offset`: `pagesPerView` arrays of BINDER_PAGE_SIZE entries, a card or null. */
function slotsOfPage(cards, offset, pagesPerView) {
  const pages = [];
  for (let page = 0; page < pagesPerView; page++) {
    const slots = [];
    for (let slot = 0; slot < BINDER_PAGE_SIZE; slot++) {
      const index = offset + page * BINDER_PAGE_SIZE + slot;
      slots.push(index < cards.length ? cards[index] : null);
    }
    pages.push(slots);
  }
  return pages;
}

/* "Pages 1–2 of 5", or "Page 3 of 5" when one page is shown (a narrow window, or a last view with one page). */
function positionLabel(offset, length, pagesPerView) {
  const totalPages = Math.max(1, Math.ceil(length / BINDER_PAGE_SIZE));
  const first = Math.floor(offset / BINDER_PAGE_SIZE) + 1;
  const last = Math.min(first + pagesPerView - 1, totalPages);
  return first === last ? `Page ${first} of ${totalPages}` : `Pages ${first}–${last} of ${totalPages}`;
}
