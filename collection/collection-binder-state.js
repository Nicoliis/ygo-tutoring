/*
 * Backlog binder behaviour: what a slot does. Position and paging are in binder-controller.js; drawing is in
 * views/ (binder-view.js, card-slot-view.js).
 *
 *   renderBinder(cards, focus)   draws the binder for the filtered, sorted cards (called by renderBacklog)
 *   resetBinder()                back to the first view; called when the search, filter or sort changes
 */

/* What a slot does: open the card details, edit the owned quantity, remove it (as the old Backlog row did). */
function buildBinderSlot(card) {
  return buildCardSlot(card, {
    onOpen: () => openCardDetailsFromPicture(card),
    stepper: panelAllows("allowQtyEdit") ? buildBacklogQtyStepper(card) : null,
    onRemove: panelAllows("allowRemove") ? () => removeCard(card.id) : null,
  });
}

let backlogBinder = null;

function binderOfBacklog() {
  if (!backlogBinder) backlogBinder = createBinder({ container: backlogListEl, buildSlot: buildBinderSlot });
  return backlogBinder;
}

function resetBinder() {
  binderOfBacklog().reset();
}

function renderBinder(cards, focus = null) {
  binderOfBacklog().render(cards, focus);
}
