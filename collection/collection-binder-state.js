/*
 * Backlog binder behaviour: where the binder is, how many pages fit, and what its slots do.
 * Paging rules are in binder-paging.js; drawing is in views/ (binder-view.js, card-slot-view.js).
 *
 *   renderBinder(cards, focus)   draws the binder for the filtered, sorted cards (called by renderBacklog)
 *   resetBinder()                back to the first view; called when the search, filter or sort changes
 */
const BINDER_NARROW_QUERY = `(max-width: ${BINDER_NARROW_MAX_PX}px)`;

let binderOffset = 0;
const binderNarrowMedia = window.matchMedia(BINDER_NARROW_QUERY);

function binderPagesPerView() {
  return binderNarrowMedia.matches ? BINDER_NARROW_PAGES : BINDER_WIDE_PAGES;
}

function resetBinder() {
  binderOffset = 0;
}

/* What a slot does: open the card details, edit the owned quantity, remove it (as the old Backlog row did). */
function buildBinderSlot(card) {
  return buildCardSlot(card, {
    onOpen: () => openCardDetailsFromPicture(card),
    stepper: panelAllows("allowQtyEdit") ? buildBacklogQtyStepper(card) : null,
    onRemove: panelAllows("allowRemove") ? () => removeCard(card.id) : null,
  });
}

function renderBinder(cards, focus = null) {
  const pagesPerView = binderPagesPerView();
  binderOffset = clampOffset(binderOffset, cards.length, pagesPerView);
  const turnTo = (direction, which) => () => {
    binderOffset = turn(binderOffset, direction, cards.length, pagesPerView);
    renderBinder(cards, which);
  };
  renderBinderView(
    backlogListEl,
    { cards, offset: binderOffset, pagesPerView, focus },
    { onPrevious: turnTo(BINDER_PREVIOUS, "previous"), onNext: turnTo(BINDER_NEXT, "next"), buildSlot: buildBinderSlot }
  );
}

// Crossing the narrow-window limit changes how many pages fit: draw the Backlog again.
binderNarrowMedia.addEventListener("change", () => {
  if (typeof renderBacklog === "function") renderBacklog();
});
