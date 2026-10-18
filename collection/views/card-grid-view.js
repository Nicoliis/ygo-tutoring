/*
 * Card picture tile for engines and deck sections: DOM only, no state and no rules.
 *
 *   renderCardPicture(card, { onOpen, onRemove, removeLabel, dragMovePayload, dragCardPayload, onSortDrop })
 *
 * One tile per copy; it opens the card details, can be removed, and can be dragged: a deck card carries its move
 * payload, an engine card carries just that card (dragCardPayload = { engineId, cardId }). With onSortDrop(payload)
 * the tile is also a place to drop another engine card; it returns true when it handled the drop (a re-sort), so the
 * drop does not go on to the engine.
 * Needs card-slot-view.js (buildCardFace).
 */
function renderCardPicture(card, { onOpen, onRemove, removeLabel, dragMovePayload, dragCardPayload, onSortDrop }) {
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
  if (dragCardPayload) {
    open.draggable = true;
    open.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      e.dataTransfer.setData("application/x-engine-card", JSON.stringify(dragCardPayload));
      e.dataTransfer.effectAllowed = "copy";
    });
  }
  open.addEventListener("click", () => onOpen());
  open.appendChild(buildCardFace(card));
  wrapper.appendChild(open);

  if (onSortDrop) {
    wrapper.addEventListener("dragover", (e) => {
      if (!e.dataTransfer.types.includes("application/x-engine-card")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      wrapper.classList.add("sort-target");
    });
    wrapper.addEventListener("dragleave", () => wrapper.classList.remove("sort-target"));
    wrapper.addEventListener("drop", (e) => {
      wrapper.classList.remove("sort-target");
      const raw = e.dataTransfer.getData("application/x-engine-card");
      if (!raw) return;
      try {
        if (onSortDrop(JSON.parse(raw))) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
        // malformed payload: let the engine handle the drop
      }
    });
  }

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
