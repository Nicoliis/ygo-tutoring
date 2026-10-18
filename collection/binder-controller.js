/*
 * Binder controller: where a binder is, how many pages fit, and the page-turning buttons. One controller per binder
 * (the Backlog, the completionist binder), so two binders never share a position.
 *
 *   const binder = createBinder({ container, buildSlot })
 *   binder.render(items, focus)   draws the view for `items` (focus: "previous" | "next" | null, after a page turn)
 *   binder.reset()                back to the first view (the list of items changed)
 *
 * Needs binder-paging.js and views/binder-view.js. Drawing itself is in the view.
 */
const BINDER_NARROW_QUERY = `(max-width: ${BINDER_NARROW_MAX_PX}px)`;

function createBinder({ container, buildSlot }) {
  let offset = 0;
  let lastItems = [];
  const narrowMedia = window.matchMedia(BINDER_NARROW_QUERY);

  function pagesPerView() {
    return narrowMedia.matches ? BINDER_NARROW_PAGES : BINDER_WIDE_PAGES;
  }

  function render(items, focus = null) {
    lastItems = items;
    const pages = pagesPerView();
    offset = clampOffset(offset, items.length, pages);
    const turnTo = (direction, which) => () => {
      offset = turn(offset, direction, items.length, pages);
      render(items, which);
    };
    renderBinderView(
      container,
      { cards: items, offset, pagesPerView: pages, focus },
      { onPrevious: turnTo(BINDER_PREVIOUS, "previous"), onNext: turnTo(BINDER_NEXT, "next"), buildSlot }
    );
  }

  // Crossing the narrow-window limit changes how many pages fit: draw the same items again.
  narrowMedia.addEventListener("change", () => render(lastItems));

  return {
    render,
    reset() {
      offset = 0;
    },
  };
}
