function buildSidebarToggle() {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.id = "appSidebarToggle";
  toggle.setAttribute("aria-label", "Toggle navigation sidebar");
  toggle.setAttribute("aria-expanded", "true");
  toggle.textContent = "☰";
  return toggle;
}

/* Only the current area's pages, preceded by the way back to the main menu. */
function buildSidebarNav(area) {
  const currentPage = currentAreaPage();
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", `${area.label} navigation`);
  const list = document.createElement("ul");
  list.appendChild(buildBackToMenuItem());
  area.pages.forEach((page) => list.appendChild(buildSidebarItem(page, page === currentPage)));
  nav.appendChild(list);
  return nav;
}

function buildSidebar(area) {
  const aside = document.createElement("aside");
  aside.id = "appSidebar";

  const toggle = buildSidebarToggle();
  aside.appendChild(toggle);

  const title = document.createElement("div");
  title.className = "sidebar-area";
  title.textContent = area.label;
  aside.appendChild(title);

  aside.appendChild(buildSidebarNav(area));

  toggle.addEventListener("click", () => {
    const collapsed = !aside.classList.contains("collapsed");
    applySidebarCollapsedState(aside, toggle, collapsed);
    writeSidebarCollapsedState(collapsed);
  });

  return aside;
}
