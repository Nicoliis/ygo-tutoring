/*
 * The app is split into four areas, each with its own sidebar and visual theme.
 * A page is added to an area's `pages` ONLY when the page exists. Hrefs are relative to the app root.
 */
const AREAS = [
  {
    id: "run",
    label: "Run",
    description: "Open your boxes, pull cards and advance through the boosters.",
    pages: [{ label: "Progression Run", href: "progression/index.html" }],
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Manage your backlog, forge engines and build decks.",
    pages: [
      { label: "Backlog", href: "workshop/backlog.html" },
      { label: "Synergy Builder", href: "workshop/synergy.html" },
      { label: "Deckbuilding", href: "workshop/deckbuilding.html" },
    ],
  },
  {
    id: "store",
    label: "Store",
    description: "Sell cards for money and buy boosters you have reached.",
    pages: [
      { label: "Sell", href: "store/sell.html" },
      { label: "Buy", href: "store/buy.html" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    description: "Booster Draft, Proxy Sheet Builder and the Pack Puller.",
    pages: [
      { label: "Booster Draft", href: "draft/index.html" },
      { label: "Proxy Sheet Builder", href: "proxy-builder/index.html" },
      { label: "Progression Series Pack Puller", href: "tracker/index.html" },
    ],
  },
];

// Folders that hold pages one level below the app root (also covers the retired collection redirect).
const AREA_FOLDERS = ["workshop", "store", "progression", "draft", "proxy-builder", "tracker", "collection"];

function pageIsInsideAreaFolder() {
  return AREA_FOLDERS.some((folder) => window.location.pathname.includes(`/${folder}/`));
}

function hrefFromRoot(path) {
  return (pageIsInsideAreaFolder() ? "../" : "") + path;
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
