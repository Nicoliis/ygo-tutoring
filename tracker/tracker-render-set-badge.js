function renderSelectedSetBadge() {
  if (!selectedSetName) {
    selectedSetBadgeEl.hidden = true;
    selectedSetBadgeEl.innerHTML = "";
    return;
  }
  const entry = (allSetsCache || []).find((s) => s.name === selectedSetName);
  const dateLabel = entry && entry.releaseDate ? ` (released ${escapeHtml(entry.releaseDate)})` : "";
  selectedSetBadgeEl.hidden = false;
  selectedSetBadgeEl.innerHTML = `
    <span>Selected set: <strong>${escapeHtml(selectedSetName)}</strong>${dateLabel}</span>
    <button type="button" class="btn-toggle btn-change-set" aria-label="Change selected set">Change</button>
  `;
  selectedSetBadgeEl.querySelector(".btn-change-set").addEventListener("click", () => {
    setPickerOpen = true;
    renderSetPicker();
    setSearchInput.focus();
  });
}
