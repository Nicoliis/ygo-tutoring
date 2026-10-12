function buildSidebarToggle() {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "appSidebarToggle";
  toggle.setAttribute("aria-label", "Toggle navigation sidebar");
  toggle.setAttribute("aria-expanded", "true");
  toggle.textContent = "☰";
  return toggle;
}

function buildSidebarNav(activeSlug) {
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Tool navigation");
  const list = document.createElement("ul");
  NAV_ENTRIES.forEach((entry) => list.appendChild(buildSidebarItem(entry, activeSlug)));
  nav.appendChild(list);
  return nav;
}

function buildSidebar() {
  const aside = document.createElement("aside");
  aside.id = "appSidebar";

  const toggle = buildSidebarToggle();
  aside.appendChild(toggle);
  aside.appendChild(buildSidebarNav(currentSlug()));

  toggle.addEventListener("click", () => {
    const collapsed = !aside.classList.contains("collapsed");
    applySidebarCollapsedState(aside, toggle, collapsed);
    writeSidebarCollapsedState(collapsed);
  });

  return aside;
}
