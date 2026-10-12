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

renderSetPicker();
renderTrackers();
