const SIDEBAR_COLLAPSE_KEY = "ygoSidebarCollapsed";
const SIDEBAR_MOBILE_QUERY = "(max-width: 640px)";

function readSidebarCollapsedState() {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch (err) {
    /* localStorage unavailable (e.g. privacy mode) — fall through to default */
  }
  return window.matchMedia(SIDEBAR_MOBILE_QUERY).matches;
}

function writeSidebarCollapsedState(collapsed) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? "true" : "false");
  } catch (err) {
    /* ignore persistence failures */
  }
}

function applySidebarCollapsedState(aside, toggle, collapsed) {
  aside.classList.toggle("collapsed", collapsed);
  toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
}
