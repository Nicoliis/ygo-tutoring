/*
 * The Backlog panel: the owned cards you can look through, search, open for details and drag out.
 * One element, mounted by every Workshop screen, so it looks and behaves the same everywhere.
 *
 *   mountBacklogPanel(containerEl, { allowAdd, allowRemove, allowQtyEdit }) -> { refresh }
 *
 * - It builds the same markup (and element ids) the collection modules expect, so call it BEFORE
 *   collection-dom-refs.js runs.
 * - Defaults depend on the active profile: free-form profiles (Sandbox) may add cards from the database,
 *   remove them and edit quantities; Progression Run profiles get cards from packs only.
 * - refresh() redraws from the stored collection; every screen calls it (through its renderAll) after any change.
 */
let backlogPanelOptions = { allowAdd: true, allowRemove: true, allowQtyEdit: true };

function backlogPanelDefaults() {
  const profile = typeof getActiveProfile === "function" ? getActiveProfile() : null;
  const free = !profile || profile.mode !== "progression";
  return { allowAdd: free, allowRemove: free, allowQtyEdit: free };
}

function mountBacklogPanel(containerEl, options = {}) {
  backlogPanelOptions = { ...backlogPanelDefaults(), ...options };

  const section = document.createElement("section");
  section.id = "backlogSection";
  section.className = "panel";

  const heading = document.createElement("h2");
  heading.textContent = "Backlog";
  section.appendChild(heading);

  if (backlogPanelOptions.allowAdd) {
    section.insertAdjacentHTML(
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
    `<input id="backlogSearchInput" type="text" class="search-input" placeholder="Search backlog&hellip;" aria-label="Search backlog" autocomplete="off">
     <div id="backlogList" class="backlog-list"></div>`
  );

  containerEl.prepend(section);

  return {
    refresh() {
      if (typeof renderBacklog === "function") renderBacklog();
    },
  };
}

/* Read by collection/collection-render-backlog.js and the empty-state text. */
function backlogOption(name) {
  return backlogPanelOptions[name] !== false;
}
