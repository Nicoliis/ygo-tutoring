// Synergy Builder screen: the Backlog panel next to the engines.
function renderAll() {
  clearFloatingOverlays();
  backlogPanel.refresh();
  renderEngines();
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
