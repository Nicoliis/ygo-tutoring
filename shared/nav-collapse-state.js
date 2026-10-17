const SIDEBAR_COLLAPSE_KEY = "ygoSidebarCollapsed";
const SIDEBAR_MOBILE_QUERY = "(max-width: 640px)";

function readSidebarCollapsedState() {
  const stored = loadData(SIDEBAR_COLLAPSE_KEY);
  if (typeof stored === "boolean") return stored;
  return window.matchMedia(SIDEBAR_MOBILE_QUERY).matches;
}

function writeSidebarCollapsedState(collapsed) {
  saveData(collapsed, SIDEBAR_COLLAPSE_KEY);
}

function applySidebarCollapsedState(aside, toggle, collapsed) {
  aside.classList.toggle("collapsed", collapsed);
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}
