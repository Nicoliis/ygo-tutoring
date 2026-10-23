/* The main menu screen: one card per area (as far as the profile's mode shows it), each leading to its first screen. */
function renderMainMenu() {
  const profile = getActiveProfile();
  document.getElementById("menuProfileLine").textContent = `Playing as ${profile.name}`;
  const grid = document.getElementById("areaGrid");
  grid.innerHTML = "";
  visibleAreas(profile).forEach((area) => {
    const pages = visiblePages(area, profile);
    const link = document.createElement("a");
    link.className = "tool-card area-card";
    link.dataset.area = area.id;
    link.href = pages[0].href;
    const title = document.createElement("h2");
    title.textContent = area.label;
    const description = document.createElement("p");
    description.textContent = areaDescription(area, profile);
    const pageList = document.createElement("p");
    pageList.className = "area-card-pages";
    pageList.textContent = pages.map((page) => page.label).join(" · ");
    link.append(title, description, pageList);
    grid.appendChild(link);
  });
}

renderMainMenu();
