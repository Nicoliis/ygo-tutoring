function renderSetPicker() {
  setPickerToggle.setAttribute("aria-expanded", String(setPickerOpen));
  setPickerToggle.setAttribute("aria-label", setPickerOpen ? "Hide set picker" : "Show set picker");
  setPickerToggle.textContent = setPickerOpen ? "✕ Close" : "+ Pick a set";
  setPickerBody.classList.toggle("collapsed", !setPickerOpen);

  renderSelectedSetBadge();
  renderSetResultsList();
}
