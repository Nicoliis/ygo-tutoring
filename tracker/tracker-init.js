createTrackerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (createTracker(trackerNameInput.value)) {
    trackerNameInput.value = "";
    renderTrackers();
    trackerNameInput.focus();
  }
});

setPickerToggle.addEventListener("click", () => {
  setPickerOpen = !setPickerOpen;
  if (setPickerOpen && !allSetsCache && !isFetchingSets) {
    fetchAllSets().catch(() => {});
  }
  renderSetPicker();
});

setSearchInput.addEventListener("input", () => {
  renderSetPicker();
});

/* The card details window changed engines in the saved collection: reload it so this page never saves a stale copy. */
function onCardEnginesChanged() {
  collection = loadCollection();
}

renderSetPicker();
renderTrackers();
