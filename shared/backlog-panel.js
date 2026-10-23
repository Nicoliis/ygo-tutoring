/*
 * The Backlog panel: the owned cards you can look through, search, filter by card type, open for details and drag out.
 * One element, mounted by every Workshop screen, so it looks and behaves the same everywhere.
 *
 *   mountBacklogPanel(containerEl, { allowAdd, allowRemove, allowQtyEdit, separateSearch }) -> { refresh }
 * - separateSearch: the card database search gets its own panel NEXT TO the Backlog (left of it) instead of sitting
 *   on top of the list.
 *
 * - It builds the same markup (and element ids) the collection modules expect, so call it BEFORE
 *   collection-dom-refs.js runs.
 * - Defaults depend on the active profile: free-form profiles (Sandbox) may add cards from the database,
 *   remove them and edit quantities; Progression Run profiles get cards from packs only.
 * - refresh() redraws from the stored collection; every screen calls it (through its renderAll) after any change.
 * - The applied type filter lives in `appliedBacklogFilter` (saved per profile by backlog-filter.js).
 */
let backlogPanelOptions = { allowAdd: true, allowRemove: true, allowQtyEdit: true };
let appliedBacklogFilter = emptyFilter();
let appliedBacklogSort = "added";

const FILTER_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">' +
  '<path d="M3 4h18l-7 8.5V20l-4-2v-5.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

function backlogPanelDefaults() {
  const profile = typeof getActiveProfile === "function" ? getActiveProfile() : null;
  const free = !profile || (profile.mode !== "progression" && profile.mode !== "handtest");
  return { allowAdd: free, allowRemove: free, allowQtyEdit: free };
}

/* Active state and the number of ticked types on the filter button. */
function updateBacklogFilterButton() {
  const btn = document.getElementById("backlogFilterBtn");
  if (!btn) return;
  const count = activeFilterCount(appliedBacklogFilter);
  btn.classList.toggle("bf-active", count > 0);
  btn.querySelector(".bf-count").textContent = count > 0 ? String(count) : "";
  btn.setAttribute("aria-label", count > 0 ? `Filter backlog (filter active, ${count} selected)` : "Filter backlog");
  btn.title = count > 0 ? `Filter active: ${count} selected` : "Filter backlog by card type or synergy";
}

function mountBacklogPanel(containerEl, options = {}) {
  backlogPanelOptions = { ...backlogPanelDefaults(), ...options };
  appliedBacklogFilter = loadBacklogFilter();
  appliedBacklogSort = loadBacklogSort();

  const section = document.createElement("section");
  section.id = "backlogSection";
  section.className = "panel";

  const heading = document.createElement("h2");
  heading.textContent = "Backlog";
  section.appendChild(heading);

  let searchSection = null;
  if (backlogPanelOptions.allowAdd) {
    const searchTarget = backlogPanelOptions.separateSearch ? (searchSection = document.createElement("section")) : section;
    if (searchSection) {
      searchSection.id = "cardSearchSection";
      searchSection.className = "panel";
      searchSection.innerHTML = "<h2>Card search</h2>";
    }
    searchTarget.insertAdjacentHTML(
      "beforeend",
      `<div class="card-search">
        <input id="cardSearchInput" type="text" class="search-input" placeholder="Search card database to add&hellip;" aria-label="Search card database to add a new card" autocomplete="off">
        <div id="cardSearchStatus" class="card-search-status" aria-live="polite"></div>
        <div id="cardSearchResults" class="card-search-results"></div>
      </div>`
    );
  }

  section.insertAdjacentHTML(
    "beforeend",
    `<div class="backlog-search-row">
       <input id="backlogSearchInput" type="text" class="search-input" placeholder="Search name, effect, attribute&hellip;" aria-label="Search backlog by name, effect text, attribute, race or type" autocomplete="off">
     </div>
     <div class="backlog-tools-row">
       <select id="backlogSortSelect" class="backlog-sort" aria-label="Sort backlog">
         ${BACKLOG_SORTS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("")}
       </select>
       <button id="backlogFilterBtn" type="button" class="backlog-filter-btn" aria-haspopup="dialog" aria-label="Filter backlog">
         ${FILTER_ICON_SVG}<span class="bf-count" aria-hidden="true"></span>
       </button>
     </div>
     <div id="backlogList" class="backlog-list"></div>`
  );

  containerEl.prepend(section);
  if (searchSection) containerEl.prepend(searchSection); // the search panel sits to the left of the Backlog

  const sortSelect = document.getElementById("backlogSortSelect");
  sortSelect.value = appliedBacklogSort;
  sortSelect.addEventListener("change", () => {
    appliedBacklogSort = sortSelect.value;
    saveBacklogSort(appliedBacklogSort);
    if (typeof resetBinder === "function") resetBinder();
    if (typeof renderAll === "function") renderAll();
  });

  document.getElementById("backlogFilterBtn").addEventListener("click", () => {
    openBacklogFilterModal({
      getCards: () => collection.cards,
      onApply: () => {
        appliedBacklogFilter = loadBacklogFilter();
        updateBacklogFilterButton();
        if (typeof resetBinder === "function") resetBinder();
        if (typeof renderAll === "function") renderAll();
      },
    });
  });
  updateBacklogFilterButton();

  return {
    refresh() {
      if (typeof renderBacklog === "function") renderBacklog();
      updateBacklogFilterButton();
    },
  };
}

/* Read by collection/collection-render-backlog.js and the empty-state text. */
function backlogOption(name) {
  return backlogPanelOptions[name] !== false;
}
