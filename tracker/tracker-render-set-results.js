function renderSetResultsList() {
  setResultsListEl.innerHTML = "";

  if (isFetchingSets) {
    setResultsListEl.innerHTML = '<p class="empty-msg">Loading sets&hellip;</p>';
    return;
  }
  if (!allSetsCache) {
    setResultsListEl.innerHTML = '<p class="empty-msg">Open this section to load the set list.</p>';
    return;
  }

  const filterText = setSearchInput.value.trim().toLowerCase();
  const filtered = filterText
    ? allSetsCache.filter((entry) => entry.name.toLowerCase().includes(filterText))
    : allSetsCache;

  if (filtered.length === 0) {
    setResultsListEl.innerHTML = '<p class="empty-msg">No sets match your search.</p>';
    return;
  }

  filtered.slice(0, MAX_SET_RESULTS).forEach((entry) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "set-result-row" + (entry.name === selectedSetName ? " selected" : "");
    row.setAttribute("aria-label", `Select set ${entry.name}${entry.releaseDate ? `, released ${entry.releaseDate}` : ""}`);
    row.innerHTML = `
      <span class="set-result-name">${escapeHtml(entry.name)}</span>
      <span class="set-result-date">${entry.releaseDate ? escapeHtml(entry.releaseDate) : ""}</span>
    `;
    row.addEventListener("click", () => {
      selectedSetName = entry.name;
      setPickerOpen = false;
      renderSetPicker();
      renderTrackers();
    });
    setResultsListEl.appendChild(row);
  });

  if (filtered.length > MAX_SET_RESULTS) {
    const hint = document.createElement("p");
    hint.className = "empty-msg";
    hint.textContent = `Showing first ${MAX_SET_RESULTS} of ${filtered.length} — type to narrow results.`;
    setResultsListEl.appendChild(hint);
  }
}
