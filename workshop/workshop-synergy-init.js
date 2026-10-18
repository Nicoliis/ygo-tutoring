// Synergy Builder screen: the Backlog panel next to the engines.
function renderAll() {
  clearFloatingOverlays();
  backlogPanel.refresh();
  renderEngines();
}

/* The card details window changed engines in the saved collection: reload it so this page never saves a stale copy. */
function onCardEnginesChanged() {
  collection = loadCollection();
  renderAll();
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

document.addEventListener("click", () => {
  if (expandedCardId !== null) {
    expandedCardId = null;
    renderAll();
  }
});

renderAll();
