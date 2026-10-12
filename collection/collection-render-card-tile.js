// Renders one physical copy of a card as a tile: the shared card-tag plus a small remove
// control overlaid on its corner — used wherever a group (an engine, or a deck section) lists
// its cards one tile per copy, no quantity multiplier.
function renderCardTile(card, { onRemove, removeLabel, dragMovePayload }) {
  const wrapper = document.createElement("div");
  wrapper.className = "card-tag-row";

  const tag = renderCardTag(card, { draggable: !!dragMovePayload });
  if (dragMovePayload) {
    tag.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-deck-card-move", JSON.stringify(dragMovePayload));
    });
  }
  wrapper.appendChild(tag);

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
