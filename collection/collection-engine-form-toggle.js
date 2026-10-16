function setEngineFormOpen(open) {
  engineForm.hidden = !open;
  engineFormToggle.textContent = open ? "✕ Close" : "+ New engine";
  engineFormToggle.setAttribute("aria-expanded", String(open));
}
