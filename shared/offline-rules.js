/*
 * Rules of the offline copy that need no browser: what to keep, how much, what to drop first, and how to search the
 * card data kept from earlier visits. Used by service-worker.js (through importScripts) and by the contract tests.
 * No browser APIs here, so the same code runs in both.
 */
const OFFLINE_KB = 1024;
const OFFLINE_BUDGET_BYTES = 150 * OFFLINE_KB * OFFLINE_KB; // card data + pictures kept for offline use: 150 MB
const OFFLINE_SEARCH_LIMIT = 50; // most cards an offline search returns

// Cross-origin pictures cannot be measured (no CORS), so each kept picture counts at an estimate by kind.
const IMAGE_SIZE_ESTIMATES = [
  { part: "/cards_small/", bytes: 30 * OFFLINE_KB }, // small card picture
  { part: "/cards/", bytes: 150 * OFFLINE_KB }, // full card picture
  { part: "/sets/", bytes: 50 * OFFLINE_KB }, // set picture
];
const IMAGE_SIZE_DEFAULT = 50 * OFFLINE_KB;

function estimateImageSize(url) {
  const hit = IMAGE_SIZE_ESTIMATES.find((entry) => String(url).includes(entry.part));
  return hit ? hit.bytes : IMAGE_SIZE_DEFAULT;
}

/*
 * entries: [{ key, keptAt, size }]. Returns the keys to remove, oldest first, until the total fits `limit`
 * (nothing when it already fits). Does not change the list.
 */
function pickEvictions(entries, limit) {
  let total = entries.reduce((sum, e) => sum + (Number(e.size) || 0), 0);
  if (total <= limit) return [];
  const oldestFirst = entries.slice().sort((a, b) => (a.keptAt || 0) - (b.keptAt || 0));
  const removed = [];
  for (const entry of oldestFirst) {
    if (total <= limit) break;
    removed.push(entry.key);
    total -= Number(entry.size) || 0;
  }
  return removed;
}

/*
 * answers: parsed card-data responses ({ data: [cards] }). Returns up to 50 cards whose name contains the text
 * (case-insensitive), one per card id, in name order. Anything that is not a card list is ignored.
 */
function searchKeptCards(answers, text) {
  const needle = String(text || "").trim().toLowerCase();
  const found = new Map();
  (answers || []).forEach((answer) => {
    const cards = answer && Array.isArray(answer.data) ? answer.data : [];
    cards.forEach((card) => {
      if (!card || typeof card.name !== "string") return;
      if (needle && !card.name.toLowerCase().includes(needle)) return;
      const key = card.id !== undefined ? `id:${card.id}` : `name:${card.name}`;
      if (!found.has(key)) found.set(key, card);
    });
  });
  return Array.from(found.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, OFFLINE_SEARCH_LIMIT);
}

/* The address without its query and hash, or null when it is not a normal web address. */
function plainAddress(href, baseAddress) {
  if (!href || /^(data|blob|javascript|mailto|tel):/i.test(href.trim())) return null;
  try {
    const url = new URL(href.trim(), baseAddress);
    if (url.protocol !== "http:" && url.protocol !== "https:" && url.protocol !== "file:") return null;
    url.hash = "";
    url.search = "";
    return url.href;
  } catch (err) {
    return null;
  }
}

function sameOrigin(address, baseAddress) {
  try {
    return new URL(address).origin === new URL(baseAddress).origin;
  } catch (err) {
    return false;
  }
}

/*
 * The files a page loads from its own site: scripts, stylesheets, icons, the manifest and pictures named in its
 * HTML, as plain addresses (resolved against the page, no query or hash, no duplicates). Files named inside
 * scripts or stylesheets are not found here (see cssUrls and the worker's EXTRA_FILES).
 */
function discoverFiles(pageHtml, pageAddress) {
  const found = new Set();
  const add = (href) => {
    const address = plainAddress(href, pageAddress);
    if (address && sameOrigin(address, pageAddress)) found.add(address);
  };
  for (const m of pageHtml.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of pageHtml.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  for (const m of pageHtml.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) add(m[1]);
  return Array.from(found);
}

/* The files a stylesheet loads (url(...) targets), same rules as discoverFiles. */
function cssUrls(cssText, cssAddress) {
  const found = new Set();
  for (const m of cssText.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi)) {
    const href = m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3];
    const address = plainAddress(href, cssAddress);
    if (address && sameOrigin(address, cssAddress)) found.add(address);
  }
  return Array.from(found);
}

/*
 * The text a version is made of: every address and the hash of its contents, sorted by address. The caller hashes
 * this text (SHA-256 in the worker) and keeps the first 12 hex characters as the version, so the version changes
 * when any file changes and never depends on the order files were read in.
 */
function versionInput(hashesByAddress) {
  return Object.keys(hashesByAddress)
    .sort()
    .map((address) => `${address}\n${hashesByAddress[address]}`)
    .join("\n");
}

const VERSION_LENGTH = 12;
