function initSidebar() {
  const aside = buildSidebar();
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.classList.add("has-app-sidebar");

  const toggle = aside.querySelector("#appSidebarToggle");
  applySidebarCollapsedState(aside, toggle, readSidebarCollapsedState());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar);
} else {
  initSidebar();
}
