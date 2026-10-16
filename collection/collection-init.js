engineForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (createEngine(engineNameInput.value)) {
    engineNameInput.value = "";
    setEngineFormOpen(false);
    renderAll();
  }
});

engineFormToggle.addEventListener("click", () => {
  const willOpen = engineForm.hidden;
  setEngineFormOpen(willOpen);
  if (willOpen) {
    engineNameInput.value = "";
    engineNameInput.focus();
  }
});

deckCreateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (createDeck(newDeckNameInput.value)) {
    newDeckNameInput.value = "";
    renderDecks();
  }
});

// Clicking anywhere that isn't a card tag or a modal collapses an image-expanded tag
// (modal clicks stop propagation themselves; a tag's own click also stops propagation).
document.addEventListener("click", () => {
  if (expandedCardId !== null) {
    expandedCardId = null;
    renderAll();
  }
});

renderAll();
