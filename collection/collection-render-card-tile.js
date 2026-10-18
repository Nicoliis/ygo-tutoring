// Renders one physical copy of a card as a picture tile (card-grid-view.js) — used wherever a group (an engine,
// or a deck section) lists its cards one tile per copy, no quantity multiplier.

/* A picture opens the card details directly (there is no expanded-image step any more). */
function openCardDetailsFromPicture(card) {
  maybeBackfillCardDetails(card);
  openCardDetailModal(card);
}

function renderCardTile(card, { onRemove, removeLabel, dragMovePayload, dragCardPayload }) {
  return renderCardPicture(card, {
    onOpen: () => openCardDetailsFromPicture(card),
    onRemove,
    removeLabel,
    dragMovePayload,
    dragCardPayload,
  });
}
