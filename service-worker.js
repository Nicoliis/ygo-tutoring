/*
 * The offline worker: keeps one complete, versioned copy of the app's own files so every screen opens without a
 * connection, and serves it. Saved data is never touched: this file uses only Cache Storage and only caches whose
 * names start with "ygo-" (it cannot reach localStorage at all).
 *
 * Design: specs/021-installable-offline-app (plan.md, data-model.md, contracts/service-worker-and-app-shell.md).
 * The rules that need no browser (what to keep, budget, eviction, offline card search) are in shared/offline-rules.js.
 */
importScripts("shared/offline-rules.js");

/* ---- What the app is made of ---- */

// The pages of the app, relative to this file. A Node test checks this list against the HTML files in the repository.
const APP_PAGES = [
  "index.html",
  "menu.html",
  "collection/index.html",
  "draft/index.html",
  "duel/index.html",
  "handtest/search.html",
  "handtest/edit.html",
  "progression/index.html",
  "progression/stage.html",
  "progression/boosters.html",
  "proxy-builder/index.html",
  "store/buy.html",
  "store/sell.html",
  "tracker/index.html",
  "workshop/backlog.html",
  "workshop/completionist.html",
  "workshop/deckbuilding.html",
  "workshop/synergy.html",
  "offline.html",
];

// Files that scripts name only inside code (neither a page nor a stylesheet mentions them). None today; a Node test
// finds any such file name in the scripts and fails until it is listed here.
const EXTRA_FILES = [];

// The card database and the picture host. Their answers are kept for offline use (see "Card data" below).
const API_HOST = "db.ygoprodeck.com";
const IMAGE_HOST = "images.ygoprodeck.com";
const KEPT_AT_HEADER = "x-ygo-kept-at"; // when an answer was kept (ms)
const SIZE_HEADER = "x-ygo-size"; // its exact size in bytes

const OFFLINE_PAGE = "offline.html";
const APP_CACHE_PREFIX = "ygo-app-"; // one complete copy of the app's files per version
const API_CACHE = "ygo-api"; // card data answers kept from earlier visits
const IMAGE_CACHE = "ygo-images"; // card and set pictures kept from earlier visits
const META_CACHE = "ygo-meta"; // the state and budget records
const STATE_KEY = "__state__";
const BUDGET_KEY = "__budget__";
const FETCH_PARALLEL = 8; // files fetched at the same time when building a copy

const ROOT = self.registration.scope; // the app's folder, with a trailing slash

function rootAddress(path) {
  return new URL(path, ROOT).href;
}

/* ---- Small records in the meta cache ---- */

async function readRecord(key, fallback) {
  const cache = await caches.open(META_CACHE);
  const response = await cache.match(rootAddress(key));
  if (!response) return { ...fallback };
  try {
    return { ...fallback, ...(await response.json()) };
  } catch (err) {
    return { ...fallback };
  }
}

async function writeRecord(key, value) {
  const cache = await caches.open(META_CACHE);
  await cache.put(
    rootAddress(key),
    new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } })
  );
}

// current: the version that serves the app; staged: a newer version fully stored and waiting; checkedAt: last check (ms)
const readState = () => readRecord(STATE_KEY, { current: null, staged: null, checkedAt: 0 });
const writeState = (state) => writeRecord(STATE_KEY, state);

// apiBytes: exact size of the kept card data answers; imageEstimate: estimated size of the kept pictures
const readBudget = () => readRecord(BUDGET_KEY, { apiBytes: 0, imageEstimate: 0 });
const writeBudget = (budget) => writeRecord(BUDGET_KEY, budget);

/* ---- Building a complete copy ---- */

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* Fetches the given addresses (revalidating against the site), a few at a time. Returns address → { buffer, type }. */
async function fetchAll(addresses, files, { required }) {
  const queue = addresses.filter((address) => !files.has(address));
  async function worker() {
    while (queue.length > 0) {
      const address = queue.shift();
      if (files.has(address)) continue;
      const response = await fetch(address, { cache: "no-cache" });
      if (!response.ok) {
        // A page that cannot be fetched makes the whole copy incomplete; a missing picture or style file does not.
        if (required(address)) throw new Error(`Could not fetch ${address} (${response.status})`);
        continue;
      }
      files.set(address, { buffer: await response.arrayBuffer(), type: response.headers.get("content-type") || "" });
    }
  }
  await Promise.all(Array.from({ length: FETCH_PARALLEL }, worker));
}

/*
 * Reads every page, then every file the pages and stylesheets name, and returns { version, files }. The version is the
 * hash of all the contents, so it changes when any file changes. Throws when a page cannot be fetched, so a half-read
 * app is never stored.
 */
async function collectFiles() {
  const files = new Map();
  const pageAddresses = APP_PAGES.map(rootAddress);
  const required = (address) => pageAddresses.includes(address);

  await fetchAll(pageAddresses, files, { required });

  const wanted = new Set(EXTRA_FILES.map(rootAddress));
  pageAddresses.forEach((address) => {
    const html = new TextDecoder().decode(files.get(address).buffer);
    discoverFiles(html, address).forEach((found) => wanted.add(found));
  });
  await fetchAll(Array.from(wanted), files, { required });

  // Stylesheets name more files (pictures, fonts): follow them until nothing new turns up.
  let scanned = 0;
  for (;;) {
    const styles = Array.from(files.keys()).filter((address) => address.endsWith(".css"));
    const more = new Set();
    styles.slice(scanned).forEach((address) => {
      const css = new TextDecoder().decode(files.get(address).buffer);
      cssUrls(css, address).forEach((found) => more.add(found));
    });
    scanned = styles.length;
    const before = files.size;
    await fetchAll(Array.from(more), files, { required });
    if (files.size === before) break;
  }

  const hashes = {};
  for (const [address, file] of files) hashes[address] = await sha256Hex(file.buffer);
  const version = (await sha256Hex(new TextEncoder().encode(versionInput(hashes)))).slice(0, VERSION_LENGTH);
  return { version, files };
}

/* Stores a collected copy under its version. Only returns once every file is stored. */
async function storeCopy(copy) {
  const name = APP_CACHE_PREFIX + copy.version;
  await caches.delete(name); // a half-built copy of the same name must never be reused
  const cache = await caches.open(name);
  for (const [address, file] of copy.files) {
    await cache.put(address, new Response(file.buffer, { headers: file.type ? { "content-type": file.type } : {} }));
  }
  return name;
}

/* Deletes every app copy that is neither the current nor the staged one (only caches named "ygo-app-..."). */
async function dropUnreferencedCopies() {
  const state = await readState();
  const keep = new Set([state.current, state.staged].filter(Boolean).map((version) => APP_CACHE_PREFIX + version));
  for (const name of await caches.keys()) {
    if (name.startsWith(APP_CACHE_PREFIX) && !keep.has(name)) await caches.delete(name);
  }
}

/* ---- Life cycle ---- */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const state = await readState();
      const hasCopy = state.current && (await caches.has(APP_CACHE_PREFIX + state.current));
      if (!hasCopy) {
        // First install: the copy must be complete before it becomes current, or the install fails as a whole.
        const copy = await collectFiles();
        await storeCopy(copy);
        await writeState({ ...state, current: copy.version, staged: null });
      }
      await self.skipWaiting(); // a changed worker only changes how files are kept, never what a page runs
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await dropUnreferencedCopies();
      await self.clients.claim();
    })()
  );
});

/* ---- Updates: a new version is stored in full first, and only then made current ---- */

async function tellWindows(message) {
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  windows.forEach((client) => client.postMessage(message));
}

let checking = null;

/*
 * Reads the whole app again and compares its version with the current one. A different version is stored completely in
 * its own cache and only then recorded as "staged"; a failed or interrupted download changes nothing, so the version in
 * use stays complete and a half-stored copy is never used.
 */
function checkForUpdate() {
  if (checking) return checking;
  checking = (async () => {
    let copy;
    try {
      copy = await collectFiles();
    } catch (err) {
      return; // offline, or a page could not be read: keep what is in use and try again at the next check
    }
    const state = await readState();
    if (copy.version === state.current) {
      await writeState({ ...state, checkedAt: Date.now() });
      return;
    }
    if (copy.version !== state.staged || !(await caches.has(APP_CACHE_PREFIX + copy.version))) {
      await storeCopy(copy);
    }
    const fresh = await readState();
    await writeState({ ...fresh, staged: copy.version, checkedAt: Date.now() });
    await dropUnreferencedCopies(); // an older staged copy goes now
    await tellWindows({ type: "update-ready", version: copy.version });
  })()
    .catch((err) => console.warn("Update check failed:", err))
    .finally(() => {
      checking = null;
    });
  return checking;
}

/* Makes the staged version the current one and removes the old copy. Returns the new version, or null when none waits. */
async function applyStaged({ announce }) {
  const state = await readState();
  if (!state.staged || !(await caches.has(APP_CACHE_PREFIX + state.staged))) return null;
  await writeState({ ...state, current: state.staged, staged: null });
  await dropUnreferencedCopies();
  if (announce) await tellWindows({ type: "applied", version: state.staged });
  return state.staged;
}

self.addEventListener("message", (event) => {
  const message = event.data || {};
  if (message.type === "check") {
    event.waitUntil(checkForUpdate());
  } else if (message.type === "apply") {
    event.waitUntil(applyStaged({ announce: true }));
  } else if (message.type === "status") {
    event.waitUntil(readState().then((state) => event.source && event.source.postMessage({ type: "status", ...state })));
  }
});

/* ---- Answering requests ---- */

/* The key of a page or file in the copy: no query, no hash, and a folder address means its index page. */
function copyKey(url) {
  const plain = new URL(url.href);
  plain.search = "";
  plain.hash = "";
  if (plain.pathname.endsWith("/")) plain.pathname += "index.html";
  return plain.href;
}

/* The app's own files come from the current copy only, so a screen is always one consistent version. */
async function answerFromCopy(request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/service-worker.js")) return fetch(request); // the worker itself is never served from the copy
  if (request.mode === "navigate") {
    const windows = await self.clients.matchAll({ type: "window" });
    if (windows.length <= 1) await applyStaged({ announce: false }); // with several windows open the user decides (Reload)
  }
  const state = await readState();
  if (state.current) {
    const cache = await caches.open(APP_CACHE_PREFIX + state.current);
    const hit = await cache.match(copyKey(url));
    if (hit) return hit;
  }
  try {
    return await fetch(request);
  } catch (err) {
    if (request.mode === "navigate" && state.current) {
      const cache = await caches.open(APP_CACHE_PREFIX + state.current);
      const offline = await cache.match(rootAddress(OFFLINE_PAGE));
      if (offline) return offline;
    }
    throw err;
  }
}

/* ---- Card data (the card database): network first; a good answer is kept and used when the network fails ---- */

// Keeping is queued one at a time so the size records never race each other.
let keepQueue = Promise.resolve();
function queueKeep(task) {
  keepQueue = keepQueue.then(task).catch((err) => console.warn("Could not keep an answer:", err));
  return keepQueue;
}

/* ---- Keeping within the budget ---- */

const QUOTA_HIGH = 0.8; // above this share of the browser's quota for this site, old pictures are dropped...
const QUOTA_LOW = 0.7; // ...until the share is below this
const QUOTA_BATCH = 20; // pictures dropped between two looks at the quota
let keepsSinceQuotaLook = 0;
const QUOTA_LOOK_EVERY = 25; // the quota is looked at once per this many keeps

async function pictureEntries() {
  const keys = await (await caches.open(IMAGE_CACHE)).keys();
  // Cache.keys() lists the oldest kept first, so the position stands for the time.
  return keys.map((request, index) => ({ key: request.url, keptAt: index, size: estimateImageSize(request.url) }));
}

async function cardDataEntries() {
  const cache = await caches.open(API_CACHE);
  const entries = [];
  for (const request of await cache.keys()) {
    const response = await cache.match(request);
    entries.push({
      key: request.url,
      keptAt: Number(response.headers.get(KEPT_AT_HEADER)) || 0,
      size: Number(response.headers.get(SIZE_HEADER)) || 0,
    });
  }
  return entries;
}

async function dropEntries(cacheName, keys) {
  const cache = await caches.open(cacheName);
  for (const key of keys) await cache.delete(key);
}

/*
 * Keeps card data (exact sizes) and pictures (estimated sizes) within OFFLINE_BUDGET_BYTES: pictures go first, oldest
 * first, then card data answers, oldest first. Never touches the app's own copy or anything outside these two caches.
 */
async function enforceBudget() {
  const budget = await readBudget();
  let over = budget.apiBytes + budget.imageEstimate - OFFLINE_BUDGET_BYTES;
  if (over > 0) {
    const pictures = await pictureEntries();
    const dropPictures = pickEvictions(pictures, Math.max(0, budget.imageEstimate - over));
    await dropEntries(IMAGE_CACHE, dropPictures);
    const freed = pictures.filter((p) => dropPictures.includes(p.key)).reduce((sum, p) => sum + p.size, 0);
    budget.imageEstimate = Math.max(0, budget.imageEstimate - freed);
    over -= freed;
  }
  if (over > 0) {
    const answers = await cardDataEntries();
    const dropAnswers = pickEvictions(answers, Math.max(0, budget.apiBytes - over));
    await dropEntries(API_CACHE, dropAnswers);
    const freed = answers.filter((a) => dropAnswers.includes(a.key)).reduce((sum, a) => sum + a.size, 0);
    budget.apiBytes = Math.max(0, budget.apiBytes - freed);
  }
  await writeBudget(budget);
}

/*
 * Pictures count at an estimate and browsers pad opaque answers when they add up the quota, so the quota is also
 * watched: above 80% of it, the oldest pictures are dropped until the share is below 70%.
 */
async function guardQuota() {
  if (!navigator.storage || !navigator.storage.estimate) return;
  let { usage, quota } = await navigator.storage.estimate();
  if (!quota || usage / quota <= QUOTA_HIGH) return;
  const budget = await readBudget();
  const pictures = await pictureEntries();
  while (pictures.length > 0 && usage / quota > QUOTA_LOW) {
    const batch = pictures.splice(0, QUOTA_BATCH);
    await dropEntries(IMAGE_CACHE, batch.map((p) => p.key));
    budget.imageEstimate = Math.max(0, budget.imageEstimate - batch.reduce((sum, p) => sum + p.size, 0));
    ({ usage, quota } = await navigator.storage.estimate());
  }
  await writeBudget(budget);
}

/* Runs after every keep: the budget first, and now and then the quota. */
async function afterKeep() {
  await enforceBudget();
  keepsSinceQuotaLook += 1;
  if (keepsSinceQuotaLook >= QUOTA_LOOK_EVERY) {
    keepsSinceQuotaLook = 0;
    await guardQuota();
  }
}

/* Keeps a copy of a good card data answer with its time and exact size, and adds its size to the budget. */
function keepCardData(request, response) {
  return queueKeep(async () => {
    const body = await response.blob();
    const headers = new Headers(response.headers);
    headers.set(KEPT_AT_HEADER, String(Date.now()));
    headers.set(SIZE_HEADER, String(body.size));
    const cache = await caches.open(API_CACHE);
    const before = await cache.match(request.url);
    const beforeSize = before ? Number(before.headers.get(SIZE_HEADER)) || 0 : 0;
    await cache.put(request.url, new Response(body, { status: 200, headers }));
    const budget = await readBudget();
    budget.apiBytes = Math.max(0, budget.apiBytes - beforeSize + body.size);
    await writeBudget(budget);
    await afterKeep();
  });
}

/*
 * A card search (cardinfo.php?fname=...) that cannot reach the network is answered from the card data kept so far:
 * the cards whose name contains the text, with the header x-ygo-offline so the screens can label them
 * "offline results". Anything else that is not a card search has no offline answer.
 */
async function offlineSearchAnswer(request) {
  const url = new URL(request.url);
  if (!url.pathname.endsWith("/cardinfo.php") || !url.searchParams.has("fname")) return null;
  const cache = await caches.open(API_CACHE);
  const answers = [];
  for (const key of await cache.keys()) {
    const kept = await cache.match(key);
    try {
      answers.push(await kept.json());
    } catch (err) {
      /* a kept answer that is not card data is skipped */
    }
  }
  const data = searchKeptCards(answers, url.searchParams.get("fname"));
  return new Response(JSON.stringify({ data }), {
    headers: { "content-type": "application/json", "x-ygo-offline": "1" },
  });
}

async function answerCardData(request) {
  try {
    const response = await fetch(request);
    if (response.ok) keepCardData(request, response.clone());
    return response;
  } catch (err) {
    const kept = await (await caches.open(API_CACHE)).match(request.url);
    if (kept) return kept;
    const offlineResults = await offlineSearchAnswer(request);
    if (offlineResults) return offlineResults;
    throw err;
  }
}

/* ---- Pictures (the picture host): cache first; otherwise fetched and kept ---- */

/*
 * The picture host sends no CORS headers, so a picture can only be kept as an opaque answer: its size cannot be read
 * and no header can be added. Each one counts at an estimate (estimateImageSize) and the order of Cache.keys()
 * (oldest first) tells which is oldest.
 */
function keepPicture(request, response) {
  return queueKeep(async () => {
    const cache = await caches.open(IMAGE_CACHE);
    const had = await cache.match(request.url);
    await cache.put(request.url, response);
    if (had) return;
    const budget = await readBudget();
    budget.imageEstimate += estimateImageSize(request.url);
    await writeBudget(budget);
    await afterKeep();
  });
}

async function answerPicture(request) {
  const kept = await (await caches.open(IMAGE_CACHE)).match(request.url);
  if (kept) return kept;
  // The page's own request is the only fetch for a picture: a copy of its answer is what gets kept.
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") keepPicture(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(answerFromCopy(request));
  else if (url.hostname === API_HOST) event.respondWith(answerCardData(request));
  else if (url.hostname === IMAGE_HOST) event.respondWith(answerPicture(request));
});
