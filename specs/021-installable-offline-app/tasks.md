# Tasks: Installable, Offline-Ready App

**Input**: Design documents from `/specs/021-installable-offline-app/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/service-worker-and-app-shell.md, quickstart.md

**Tests**: The pure rules go into `shared/contract-tests.js` (run by `shared/profiles.test.js` with the VS Code runtime, `ELECTRON_RUN_AS_NODE=1`, and by `shared/tests.html`); page and manifest checks go into a Node test `shared/offline.test.js`; real install, offline and update behavior is checked with headless Chrome and by hand through quickstart.md.

**Format**: `- [ ] [ID] [P?] [Story] Description with file path` — [P] = parallelizable (different files, no dependency on incomplete tasks).

**Hard rules for every task**: commit after each task (small, in the order the work is done); the worker and the page script never read or write `localStorage`, the save-file store or any cache whose name does not start with `ygo-`; no build step and no generated manifest; every new page tag is relative so the app works from any folder or sub-address; never skip the contract tests before a commit.

## Phase 1: Setup

- [X] T001 Create `icons/icon.svg` (the app's dark background `#14161c` with a simple card shape and the letters "YGO"; keep the picture inside the central 80% so it also works as a maskable icon) and produce `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-512.png` (full-bleed background) and `icons/apple-touch-icon.png` (180 px) from it with headless Chrome (`--screenshot` of a small HTML page that shows the SVG at the exact size), committing the PNGs.
- [X] T002 Create `manifest.webmanifest` at the repo root per the contract: `name` "YGO Tutoring Toolkit", `short_name` "YGO Toolkit", `start_url` `./index.html`, `scope` `./`, `id` `./`, `display` `standalone`, `theme_color` and `background_color` `#14161c`, icons 192, 512, maskable 512 (PNG) and the SVG; every path relative.

- [X] T029 Amend `.specify/memory/constitution.md` BEFORE any worker code is written (MINOR version bump, update the Sync Impact Report): Principle II gains these sentences — the app's own static files, and the pictures its pages already show, may be fetched and kept by the browser's offline copy (conditional requests at start and when a window regains focus after 30 minutes, never on a timer); kept card data and pictures reduce calls to the card API; and Additional Constraints notes that the kept copy and card data live in the browser's Cache Storage only. (Moved here from the last phase: the traffic it allows must not exist before the text allows it.)

---

## Phase 2: Foundational (blocks every story)

- [X] T003 Create `shared/offline-rules.js` (pure, no browser APIs, usable by the worker through `importScripts` and by Node tests) with: `IMAGE_SIZE_ESTIMATES` (small card picture `/cards_small/` 30 KB, full card picture `/cards/` 150 KB, set picture `/sets/` 50 KB, anything else 50 KB, in bytes), `OFFLINE_BUDGET_BYTES` = 150 × 1024 × 1024, `estimateImageSize(url)`, `pickEvictions(entries, limit)` (entries `{ key, keptAt, size }`; returns the keys to remove, oldest `keptAt` first, until the total is ≤ `limit`), `searchKeptCards(answers, text)` (answers are parsed card-data responses `{ data: [cards] }`; returns up to 50 cards whose `name` contains the text, case-insensitive, deduplicated by `id`, in name order), `discoverFiles(pageHtml, pageAddress)` (addresses of `<script src>`, `<link href>` stylesheets/icons/manifest and `<img src>` resolved against the page address, same-origin only, deduplicated, without query or hash) and `cssUrls(cssText, cssAddress)` (the `url(...)` targets, same rules), and `versionOfFiles(hashesByAddress)` (a string: the first 12 hex characters of a SHA-256 over the addresses and hashes sorted by address, using the supplied hash strings; the caller supplies the hasher).
- [X] T004 Add the pure rules from T003 to `shared/contract-tests.js` and load `shared/offline-rules.js` in `shared/profiles.test.js` and `shared/tests.html`: cases for `estimateImageSize` per kind, `pickEvictions` (oldest first, stops as soon as the total fits, nothing when already under the limit), `searchKeptCards` (case-insensitive, dedup by id, 50 max, name order, no match returns an empty list, malformed answers ignored), `discoverFiles`/`cssUrls` (relative, `../`, absolute-path and cross-origin addresses, `data:` ignored) and `versionOfFiles` (stable, order-independent, changes when one hash changes).
- [X] T005 Create `shared/app-shell.js` and `shared/app-shell.css`: `app-shell.js` registers the worker with a path relative to the page (`hrefFromRoot` when `areas.js` is loaded, otherwise computed from the page's folder depth), does nothing when service workers are unsupported, and exposes `isOffline()` (`!navigator.onLine`) and `isOfflineResponse(response)` (`response.headers.get("x-ygo-offline") === "1"`); the later stories add the install button, indicator and update notice here. Two cases are handled here: (1) when the address starts with `file:` (the app was opened as a plain file) no worker can run, so `window.appShell.unsupportedReason` is set to "Open the app from its web address to install it and use it offline."; (2) when registering the worker or opening the caches fails (private window, blocked or full storage) the same field is set to "Offline use is unavailable in this browser window."; in both cases the app keeps working online. A one-time dismissible notice (`role="status"`, text from that field) is shown on the profile screen and the main menu only, never in work screens.
- [X] T006 Add to all 18 app pages (`index.html`, `menu.html`, `collection/index.html`, `draft/index.html`, `duel/index.html`, `handtest/search.html`, `handtest/edit.html`, `progression/index.html`, `progression/stage.html`, `progression/boosters.html`, `proxy-builder/index.html`, `store/buy.html`, `store/sell.html`, `tracker/index.html`, `workshop/backlog.html`, `workshop/completionist.html`, `workshop/deckbuilding.html`, `workshop/synergy.html`) in `<head>`: `<link rel="manifest">`, `<meta name="theme-color" content="#14161c">`, `<link rel="icon">`, `<link rel="apple-touch-icon">`, the `app-shell.css` link, and before `</body>` the `app-shell.js` script, all with the correct `../` prefix for pages in folders; do it with one script and check the result with the missing-reference scan.
- [X] T007 Create `offline.html` at the repo root (a small self-contained page in the app's look: "This screen was not kept for offline use" with a link to `menu.html` and a Retry button that reloads; it links no other app file besides the icons so it always works offline).
- [X] T008 Create `service-worker.js` core: `importScripts("shared/offline-rules.js")`; constants `APP_PAGES` (the 18 pages above plus `offline.html`, relative to the worker), `EXTRA_FILES` (files that scripts name only inside code and that neither the pages nor the stylesheets mention, found by T027's scan; at least `shared/cardback.png` if scripts use it), cache name prefixes `ygo-app-`, `ygo-api`, `ygo-images`, `ygo-meta`; state helpers `readState()`/`writeState()` (the `state` entry in `ygo-meta`: `current`, `staged`, `checkedAt`) and `readBudget()`/`writeBudget()` (the `budget` entry: `apiBytes`, `imageEstimate`, `limit`); `collectFiles()` that fetches every page in `APP_PAGES` with `cache: "no-cache"`, reads the files with `discoverFiles`, fetches those, reads `cssUrls` from every stylesheet, fetches those, and returns a map address → body bytes; the install event stores the map in `ygo-app-<version>` (version from `versionOfFiles` with SHA-256 via `crypto.subtle`) and writes `state.current` only after every file is stored (the whole install fails otherwise); activate deletes every cache named `ygo-app-*` that is not `state.current` or `state.staged`; fetch handler for same-origin GET requests: look in the current copy ignoring query and hash, miss → network, network failure on a navigation → `offline.html`; `self.skipWaiting()` and `clients.claim()` (a changed worker takes over by itself).

**Checkpoint**: The app registers a worker that keeps a complete copy and serves it; every page has the install tags.

---

## Phase 3: User Story 1 - Install the app (Priority: P1) 🎯 MVP

**Goal**: The browser offers installation and the installed app opens in its own window with icon, name and colors.

**Independent Test**: quickstart.md Scenario 1.

- [X] T009 [US1] In `shared/app-shell.js` capture the browser's install offer (`beforeinstallprompt`: prevent the default, keep the event), show every element with `id="installAppBtn"` only while an offer is kept, call the kept offer's prompt on click and then forget it, hide the button on `appinstalled` and whenever the page runs as an installed app (`matchMedia("(display-mode: standalone)")` or `navigator.standalone`), and never show anything where no offer exists; while `appShell.unsupportedReason` is set, show it as a short note next to the install button's place on the profile screen and the main menu instead of the button; style the button and the note in `shared/app-shell.css`.
- [X] T010 [US1] Add the hidden "Install app" button (`id="installAppBtn"`, `hidden`, class `btn btn-secondary`, accessible name "Install app") to `index.html` (profile screen) and to the header of `menu.html`, and nowhere else.
- [X] T011 [US1] Verify installability with headless Chrome against a local static server: the manifest is read without errors, the icons load, and a worker with a fetch handler is active; record how in `specs/021-installable-offline-app/quickstart.md` if a step differs.

---

## Phase 4: User Story 2 - Open every screen without a connection (Priority: P1)

**Goal**: Every screen opens offline; card data and pictures seen before come back from the kept copy; searches work over kept cards.

**Independent Test**: quickstart.md Scenario 2 and Scenario 6.

- [X] T012 [US2] In `service-worker.js` handle card data requests (GET to the card database host): network first; a good answer is cloned into `ygo-api` with the response headers `x-ygo-kept-at` (now) and `x-ygo-size` (the exact byte length) added, and `budget.apiBytes` updated; on network failure answer from `ygo-api` (the kept answer for the same address) or fail normally.
- [X] T013 [US2] In `service-worker.js` handle picture requests (GET to the picture host): cache first from `ygo-images`; on a miss answer with `fetch(event.request)` (the page's own no-cors request: never a second fetch for the same picture) and keep a clone of the opaque response with `x-ygo-kept-at` and `x-ygo-size` = `estimateImageSize(url)` (a request that fails is not kept and not retried here), and update `budget.imageEstimate`.
- [X] T014 [US2] In `service-worker.js` enforce the budget after every keep: serialize keeps through one promise queue; when `apiBytes + imageEstimate` exceeds `OFFLINE_BUDGET_BYTES`, call `pickEvictions` over the entries of both caches and delete them (never `ygo-app-*`, never anything else); also the quota guard: when `navigator.storage.estimate()` reports usage above 80% of the quota, remove the oldest pictures until it is below 70%; a keep that fails (quota) is ignored and the request still succeeds.
- [X] T015 [US2] In `service-worker.js` answer a failed card search (`cardinfo.php` with an `fname` parameter, network error or offline) with `searchKeptCards` over every answer kept in `ygo-api`, as `{ "data": [...] }` JSON with the header `x-ygo-offline: 1`; with no match the list is empty and the header is still set.
- [X] T016 [US2] Show offline results in the card searches: in `collection/collection-run-search.js` and `proxy-builder/proxy-run-search.js` read `isOfflineResponse(response)` and, when true, set the search status to "Offline results (N) — the full database needs a connection" (or "No offline results — the full database needs a connection" when empty) instead of the normal count; keep every other path unchanged.
- [X] T017 [US2] Check the other network paths for a clear offline message and fix any that fail silently: opening a pack from a set never kept (`progression/progression-box.js` → the existing "check your connection" status must appear and the run must stay unchanged), the set list (`ygoSetDates` cache) and the first visit with no worker yet (the app simply needs a connection; `offline.html` explains it when a page cannot be loaded).

---

## Phase 5: User Story 4 - Saved data is never touched (Priority: P1)

**Goal**: Installing, updating and clearing the kept files never changes saved data.

**Independent Test**: quickstart.md Scenario 4.

- [X] T031 [US4] Report when offline use cannot work (FR-012): cover the cases of T005 in a test of the message text in `shared/offline.test.js`, and check by hand in a private window that the notice appears and the app still works online.
- [X] T018 [US4] In `shared/app-shell.js` ask the browser to make the site's storage persistent once per visit (`navigator.storage.persist()` when available, result ignored, no UI) so saved data is not evicted under storage pressure.
- [X] T019 [US4] Create `shared/offline.test.js` (Node, VS Code runtime; T027 extends it with the page, manifest and file checks) starting with a check that reads `service-worker.js` and `shared/app-shell.js` and fails if either mentions `localStorage`, `sessionStorage`, `indexedDB`, `ygoCollection`, `ygoRun`, `ygoProfiles` or `ygoDuelRoom`, and fails if `service-worker.js` deletes a cache whose name is not matched by the prefixes `ygo-app-`, `ygo-api`, `ygo-images`, `ygo-meta`.
- [X] T020 [US4] Verify by hand or with headless Chrome that deleting every `ygo-app-*` cache and reloading fetches the files again and leaves `localStorage` byte-identical (record the check in `quickstart.md` if a step differs).

---

## Phase 6: User Story 3 - Updates arrive without getting stuck (Priority: P2)

**Goal**: A new version is staged in full, announced, and applied on Reload or by itself on a single-window navigation.

**Independent Test**: quickstart.md Scenario 3.

- [X] T021 [US3] In `service-worker.js` implement the update check on the `check` message: skip when it ran less than a moment ago; run `collectFiles()`, compute the version; same as `state.current` → write `checkedAt`; same as `state.staged` → send `update-ready` again; different → store the new copy in `ygo-app-<version>`, write `state.staged` only after every file is stored, delete a half-built cache of the same name if one exists, and send `update-ready` to every window client; a failed download leaves `current` and `staged` untouched.
- [X] T022 [US3] In `service-worker.js` implement apply: on the `apply` message (and on a navigation request when `state.staged` exists and at most one window client is open) set `current = staged`, `staged = null`, delete every other `ygo-app-*` cache, and send `applied` to every window; the navigation case answers the navigation from the new copy.
- [X] T023 [US3] In `shared/app-shell.js` send `check` when the page starts and when the window becomes visible again after at least 30 minutes since the last check (no timers; the time of the last check is kept in a variable of that window and in the worker's `checkedAt`, never in browser storage), show the update notice on `update-ready` ("A new version is ready" with a Reload button that sends `apply` and reloads on `applied`; ignoring it does nothing), and on `applied` from another window show "Reload to finish the update" with a Reload button; style the notice in `shared/app-shell.css` as a fixed, dismissible strip that never covers the duel controls (below the page header, `aria-live="polite"`).

---

## Phase 7: User Story 5 - Clear feedback about the connection (Priority: P2)

**Goal**: The user always knows when the app is offline and why an action cannot run.

**Independent Test**: quickstart.md Scenario 5.

- [X] T024 [US5] In `shared/app-shell.js` add the offline indicator: a fixed strip with `role="status"` and the text "Offline — saved data and kept cards still work", shown while `navigator.onLine` is false (initial state and the `online`/`offline` events), removed when the connection returns, never taking space inside work screens (fixed at the bottom of the window, `pointer-events: none`); style it in `shared/app-shell.css`.
- [X] T025 [US5] In `duel/duel-room.js` check `isOffline()` before creating or joining a link and show "The link needs a connection." with a Retry action (re-checks and continues without reloading); practice alone and viewing a saved duel stay available offline; reuse the room's existing banner/notice mechanism.
- [X] T026 [US5] Make sure every action that needs the card database names what failed and what to do: review the card search (Backlog add, Proxy Builder), the booster autocomplete in `draft/`, the set list in `tracker/`, and the Completionist Binder set loading, and align their offline messages to "…needs a connection — reconnect and try again" where one is missing; none may fail silently.

---

## Phase 8: Polish & Cross-Cutting

- [X] T027 Create `shared/offline.test.js` (Node, run with the VS Code runtime): every `.html` page under the repo (excluding `specs/`, `.git/` and `shared/tests.html`) is listed in `APP_PAGES` of `service-worker.js` and every listed page exists; each such page contains the manifest link, the theme color meta, the icon links and loads `shared/app-shell.js`; `manifest.webmanifest` is valid JSON with the fields of the contract and every icon file exists with the stated pixel size (read the PNG header); `offline.html` links no app script; every quoted local file name ending in `.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`, `.gif`, `.mp3`, `.ogg` or `.json` found in the app's scripts exists on disk and is reachable from a page, a stylesheet or `EXTRA_FILES` (the check mirrors `discoverFiles`, fetching nothing); plus the checks of T019. This task finishes `shared/offline.test.js` created in T019.
- [X] T028 Add an automated headless-Chrome smoke script outside the repo's runtime (in the session scratchpad, not committed) that serves the repo, opens `index.html`, waits for the worker to finish installing, goes offline with the DevTools protocol or by stopping the server, loads every page of `APP_PAGES` and confirms each loads its title without errors; record the result in the final report.
- [X] T030 Run every scenario in `specs/021-installable-offline-app/quickstart.md` in Chrome and fix what fails, then run `shared/profiles.test.js`, `shared/offline.test.js`, `shared/save-utils.test.js`, the syntax and missing-reference scan, and the duplicate-declaration scan, and grep that no direct `localStorage` use exists outside `shared/save-utils.js`.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories. Inside Phase 2: T003 → T004; T005 → T006; T007 and T008 need T003 and T001/T002 (icons in the copy).
- US1 (Phase 3) needs T005, T006, T008; US2 (Phase 4) needs T008 (and T003); T012 → T013 → T014 → T015 → T016; T017 after T016.
- US4 (Phase 5) can follow right after T008; T019 needs the file created in T027 (create it with those checks first and extend it in T027, or do T027's file creation first).
- US3 (Phase 6) needs T008: T021 → T022 → T023.
- US5 (Phase 7) needs T005 and (for T025) the Duel Room code; independent of the worker.
- T029 (the constitution amendment) comes first, before any worker code. Polish last: T027 → T030. T031 follows T005.
- Task IDs are in dependency order of the phases; the file `shared/offline.test.js` is first created in T019 and finished in T027.

## Parallel Opportunities

- T001 and T003 are independent; T016, T017 and T026 touch different files; T018 and T024 both edit `app-shell.js` and must be sequential.

## Implementation Strategy

1. **MVP**: Phases 1–3 (icons, manifest, worker with the offline copy, install button): installable and the app files open offline. Validate quickstart Scenarios 1 and the file part of 2.
2. Add card data and pictures offline with the budget (Phase 4) and the data-safety guards (Phase 5).
3. Add updates (Phase 6) and the connection feedback (Phase 7), then Polish.
4. Commit after every task, in this order.
