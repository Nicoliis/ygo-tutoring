/*
 * The app is split into four areas, each with its own sidebar and visual theme.
 * A page is added to an area's `pages` ONLY when the page exists. Hrefs are relative to the app root.
 */
const AREAS = [
  {
    id: "run",
    label: "Run",
    description: "Open your boxes, pull cards and advance through the boosters.",
    descriptionByMode: { handtest: "Search any card and add it to your backlog, or edit the backlog freely." },
    pages: [
      { label: "Progression Run", href: "progression/index.html", hideInModes: ["handtest"] },
      { label: "Current Stage Pull", href: "progression/stage.html", hideInModes: ["handtest"] },
      { label: "Booster Pull", href: "progression/boosters.html", hideInModes: ["handtest"] },
      { label: "Card Search", href: "handtest/search.html", onlyModes: ["handtest"] },
      { label: "Backlog Edit", href: "handtest/edit.html", onlyModes: ["handtest"] },
    ],
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Manage your backlog, forge engines and build decks.",
    pages: [
      { label: "Backlog", href: "workshop/backlog.html" },
      { label: "Synergy Builder", href: "workshop/synergy.html" },
      { label: "Deckbuilding", href: "workshop/deckbuilding.html" },
      { label: "Completionist Binder", href: "workshop/completionist.html" },
    ],
  },
  {
    id: "store",
    label: "Store",
    description: "Sell cards for money and buy boosters you have reached.",
    hideInModes: ["handtest"], // no shop when the cards are free
    pages: [
      { label: "Sell", href: "store/sell.html" },
      { label: "Buy", href: "store/buy.html" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    description: "Booster Draft, Proxy Sheet Builder, the Pack Puller and the Duel Room.",
    pages: [
      { label: "Booster Draft", href: "draft/index.html" },
      { label: "Proxy Sheet Builder", href: "proxy-builder/index.html" },
      { label: "Progression Series Pack Puller", href: "tracker/index.html" },
      { label: "Duel Room", href: "duel/index.html" },
    ],
  },
];

// Folders that hold pages one level below the app root (also covers the retired collection redirect).
const AREA_FOLDERS = ["workshop", "store", "progression", "draft", "proxy-builder", "tracker", "collection", "duel", "handtest"];

function pageIsInsideAreaFolder() {
  return AREA_FOLDERS.some((folder) => window.location.pathname.includes(`/${folder}/`));
}

function hrefFromRoot(path) {
  return (pageIsInsideAreaFolder() ? "../" : "") + path;
}

/*
 * What a profile's mode may see. A page or area can carry `onlyModes` (shown only in those modes) or `hideInModes`
 * (hidden in those modes); everything else is shown in every mode.
 */
function modeShows(item, mode) {
  if (item.onlyModes) return item.onlyModes.includes(mode);
  if (item.hideInModes) return !item.hideInModes.includes(mode);
  return true;
}

function visiblePages(area, profile) {
  const mode = profile ? profile.mode : null;
  return area.pages.filter((page) => modeShows(page, mode));
}

/* The areas of the main menu for a profile: shown areas that still have at least one page. */
function visibleAreas(profile) {
  const mode = profile ? profile.mode : null;
  return AREAS.filter((area) => modeShows(area, mode) && visiblePages(area, profile).length > 0);
}

function areaDescription(area, profile) {
  const byMode = area.descriptionByMode;
  return (byMode && profile && byMode[profile.mode]) || area.description;
}

function pathMatchesHref(href) {
  const pathname = window.location.pathname;
  if (pathname.endsWith("/" + href)) return true;
  return href.endsWith("/index.html") && pathname.endsWith("/" + href.slice(0, -"index.html".length));
}

/* The area whose page is open, or null on the main menu. */
function currentArea() {
  return AREAS.find((area) => area.pages.some((page) => pathMatchesHref(page.href))) || null;
}

function currentAreaPage() {
  const area = currentArea();
  return area ? area.pages.find((page) => pathMatchesHref(page.href)) : null;
}
