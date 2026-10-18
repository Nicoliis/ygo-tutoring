/*
 * Card picture tile for engines and deck sections: DOM only, no state and no rules.
 *
 *   renderCardPicture(card, { onOpen, onRemove, removeLabel, dragMovePayload })
 *
 * One tile per copy; it opens the card details, can be removed, and (deck cards) carries its move payload.
 * Needs card-slot-view.js (buildCardFace).
 */
function renderCardPicture(card, { onOpen, onRemove, removeLabel, dragMovePayload }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card-tag-row card-picture-tile";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "card-picture";
  open.setAttribute("aria-label", `${card.name} — view details`);
  open.title = card.name;
  if (dragMovePayload) {
    open.draggable = true;
    open.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-deck-card-move", JSON.stringify(dragMovePayload));
    });
  }
  open.addEventListener("click", () => onOpen());
  open.appendChild(buildCardFace(card));
  wrapper.appendChild(open);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn-remove-item";
  removeBtn.textContent = "✕";
  removeBtn.setAttribute("aria-label", removeLabel);
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    onRemove();
  });
  wrapper.appendChild(removeBtn);
  return wrapper;
}
