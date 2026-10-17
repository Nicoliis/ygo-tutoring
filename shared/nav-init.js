/* A "back to menu" link that stays visible in the page header even when the sidebar is collapsed. */
function addHeaderMenuLink(area) {
  const header = document.querySelector(".app-header");
  if (!header || header.querySelector(".header-menu-link")) return;
  const link = document.createElement("a");
  link.className = "header-menu-link";
  link.href = hrefFromRoot("menu.html");
  link.textContent = `← Menu · ${area.label}`;
  link.setAttribute("aria-label", `Back to main menu (you are in ${area.label})`);
  header.appendChild(link);
}

function initSidebar() {
  const area = currentArea();
  if (!area) return; // the main menu has no sidebar: it is the entry to every area
  document.body.dataset.area = area.id;

  const aside = buildSidebar(area);
  document.body.insertBefore(aside, document.body.firstChild);
  document.body.classList.add("has-app-sidebar");
  addHeaderMenuLink(area);

  const toggle = aside.querySelector("#appSidebarToggle");
  applySidebarCollapsedState(aside, toggle, readSidebarCollapsedState());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar);
} else {
  initSidebar();
}
