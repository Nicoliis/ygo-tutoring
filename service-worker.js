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
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) event.respondWith(answerFromCopy(request));
  else if (url.hostname === API_HOST) event.respondWith(answerCardData(request));
});
