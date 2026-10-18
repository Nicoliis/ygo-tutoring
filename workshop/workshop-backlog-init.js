// Backlog screen: the panel alone.
function renderAll() {
  clearFloatingOverlays();
  backlogPanel.refresh();
}

/* The card details window changed engines in the saved collection: reload it so this page never saves a stale copy. */
function onCardEnginesChanged() {
  collection = loadCollection();
  renderAll();
}

// Clicking anywhere that isn't a card tag or a modal collapses an image-expanded tag
// (modal clicks stop propagation themselves; a tag's own click also stops propagation).
document.addEventListener("click", () => {
  if (expandedCardId !== null) {
    expandedCardId = null;
    renderAll();
  }
});

renderAll();
