// Backlog screen: the panel alone.
function renderAll() {
  clearFloatingOverlays();
  backlogPanel.refresh();
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
