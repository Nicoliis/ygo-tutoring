// Panel options (allowQtyEdit / allowRemove / allowAdd) come from shared/backlog-panel.js; without the
// panel (older pages) everything stays enabled.
function panelAllows(name) {
  return typeof backlogOption === "function" ? backlogOption(name) : true;
}

function buildBacklogRow(card) {
  const row = document.createElement("div");
  row.className = "backlog-row";

  row.appendChild(renderCardTag(card, { draggable: true, directDetails: true }));
  if (panelAllows("allowQtyEdit")) {
    row.appendChild(buildBacklogQtyStepper(card));
  } else {
    const qty = document.createElement("span");
    qty.className = "backlog-qty-static";
    qty.textContent = `×${card.quantityOwned}`;
    qty.setAttribute("aria-label", `Owned quantity for ${card.name}: ${card.quantityOwned}`);
    row.appendChild(qty);
  }

  if (panelAllows("allowRemove")) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-secondary btn-remove-card";
    removeBtn.textContent = "X";
    removeBtn.setAttribute("aria-label", `Remove ${card.name} from backlog`);
    removeBtn.addEventListener("click", () => removeCard(card.id));
    row.appendChild(removeBtn);
  }

  return row;
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
  const filtered = typeFilter ? bySearch.filter((c) => matchesFilter(c, typeFilter)) : bySearch;

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
  sortBacklogCards(filtered, sortId).forEach((card) => backlogListEl.appendChild(buildBacklogRow(card)));
}
