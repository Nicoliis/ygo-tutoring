/* The main menu screen: one card per area, each leading to that area's first screen. */
function renderMainMenu() {
  const profile = getActiveProfile();
  document.getElementById("menuProfileLine").textContent = `Playing as ${profile.name}`;
  const grid = document.getElementById("areaGrid");
  grid.innerHTML = "";
  AREAS.forEach((area) => {
    if (area.pages.length === 0) return;
    const link = document.createElement("a");
    link.className = "tool-card area-card";
    link.dataset.area = area.id;
    link.href = area.pages[0].href;
    const title = document.createElement("h2");
    title.textContent = area.label;
    const description = document.createElement("p");
    description.textContent = area.description;
    const pages = document.createElement("p");
    pages.className = "area-card-pages";
    pages.textContent = area.pages.map((page) => page.label).join(" · ");
    link.append(title, description, pages);
    grid.appendChild(link);
  });
}

renderMainMenu();
