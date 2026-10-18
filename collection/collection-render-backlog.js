// Panel options (allowQtyEdit / allowRemove / allowAdd) come from shared/backlog-panel.js; without the
// panel (older pages) everything stays enabled.
function panelAllows(name) {
  return typeof backlogOption === "function" ? backlogOption(name) : true;
}

function renderBacklog() {
  backlogListEl.innerHTML = "";

  if (collection.cards.length === 0) {
    backlogListEl.innerHTML = panelAllows("allowAdd")
      ? '<p class="empty-msg">No cards logged yet. Add one above.</p>'
      : '<p class="empty-msg">No cards yet. Open some packs to fill your backlog.</p>';
    return;
  }

  const filterLower = backlogFilter.trim().toLowerCase();
  // the search looks at the name, the effect text, the attribute, the race and the type of each card
  const bySearch = collection.cards.filter((c) => !filterLower || cardMatchesSearch(c, filterLower));
  // The type filter only exists when the Backlog panel was mounted; without it every card is listed.
  const typeFilter = typeof appliedBacklogFilter !== "undefined" ? appliedBacklogFilter : null;
  const synergyIndex = typeFilter && hasSynergySelection(typeFilter) ? buildSynergyIndex(collection.cards) : null;
  const filtered = typeFilter ? bySearch.filter((c) => matchesFilter(c, typeFilter, synergyIndex)) : bySearch;

  if (filtered.length === 0) {
    if (bySearch.length > 0 && typeFilter && isFilterActive(typeFilter)) {
      backlogListEl.innerHTML = '<p class="empty-msg">No cards match your filter. <button type="button" class="btn btn-secondary btn-small" id="clearBacklogFilterBtn">Clear filter</button></p>';
      document.getElementById("clearBacklogFilterBtn").addEventListener("click", () => {
        clearBacklogFilter();
        appliedBacklogFilter = loadBacklogFilter();
        if (typeof updateBacklogFilterButton === "function") updateBacklogFilterButton();
        renderAll();
      });
    } else {
      backlogListEl.innerHTML = '<p class="empty-msg">No cards match your search.</p>';
    }
    return;
  }

  const sortId = typeof appliedBacklogSort !== "undefined" ? appliedBacklogSort : "added";
  renderBinder(sortBacklogCards(filtered, sortId));
}
