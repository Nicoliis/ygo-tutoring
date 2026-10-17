// Deckbuilding screen: the Backlog panel, the engines (to add whole engines to a deck) and the decks.
function renderAll() {
  clearFloatingOverlays();
  backlogPanel.refresh();
  renderEngines();
  renderDecks();
}

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

document.addEventListener("click", () => {
  if (expandedCardId !== null) {
    expandedCardId = null;
    renderAll();
  }
});

renderAll();
