# Phase 0 Research: Installable, Offline-Ready App

## Decision 1: How the app's own files are listed for offline use
- **Decision**: The service worker has a hand-kept list of the app's pages (19 entries). At install and at each update check it fetches every page, reads the `src`/`href` of scripts, styles, icons and images in it, reads `url(...)` references inside the fetched stylesheets, and keeps all of them in one versioned copy. A Node contract test compares the list with the HTML files on disk and fails when a page is missing.
- **Rationale**: No build step and no generated file to forget to refresh (FR-013). Pages already declare their files, so discovery is exact for what each page loads. Total size is about 1.9 MB, so keeping everything is cheap.
- **Alternatives**: A generated manifest (needs a tool the user may not have and goes stale silently); caching files only when first used (the screen visited offline might never have been opened).

## Decision 2: Version and update detection
- **Decision**: The version of the app is the hash (SHA-256, first 12 hex characters) of the contents of all discovered files, sorted by address. A check fetches every file with revalidation (`cache: "no-cache"`), hashes the bodies, and compares with the current version. A different hash means a new version: all its files are stored in a new cache `ygo-app-<version>` and the version is recorded as "staged".
- **Rationale**: Detects any change in any file with no manual version number; a partial download never becomes current because the state flips only after every file is stored (FR-011).
- **Alternatives**: A hand-bumped version constant (easy to forget, then users stay stuck); relying on the browser's worker update check alone (it only sees changes to the worker file, so page files would never refresh).

## Decision 3: When checks run and when the new version applies
- **Decision**: A check runs when the app starts and when a window regains focus after at least 30 minutes; never on a timer. The page is told "update ready" and shows a notice with Reload. The worker applies the staged version by itself on a page navigation when at most one app window is open (the one being navigated away from), so the new page loads entirely from the new copy; with several windows open it waits for Reload.
- **Rationale**: Meets "never stuck on an old version" and "never interrupt a duel or a pack" together: no reload happens by itself during use, and a navigation (an explicit user action) is a safe moment. Satisfies Principle II (no polling).
- **Alternatives**: Applying immediately with `skipWaiting` (interrupts and can mix versions); timers (polling).

## Decision 4: Fetch strategies
- **Decision**: App files and pages: served from the current copy, never from the network, so a screen is always one consistent version; an address not in the copy falls back to the network and, if that fails, to `offline.html`. Card API (`db.ygoprodeck.com`, GET): network first, and the last good answer is kept and used when the network fails. Card pictures (`images.ygoprodeck.com`): cache first, otherwise fetched and kept.
- **Rationale**: Consistency for code; freshness when online for card data; pictures never change for a given address.
- **Alternatives**: Stale-while-revalidate for code (mixing); cache-first for the API (stale prices and rarities).

## Decision 5: Cross-origin pictures and the 150 MB limit
- **Decision**: The picture host sends no CORS headers (verified), so pictures can only be stored as opaque responses. Each stored picture is counted at an estimated size by kind (small card picture 30 KB, full card picture 150 KB, set picture 50 KB); when the estimate passes 150 MB the oldest pictures are removed first. If the browser reports its usage above 80% of the quota, pictures are removed until it is below 70%. Card API answers are measured exactly and share the same 150 MB budget with the pictures (pictures use their estimate).
- **Rationale**: The real size of an opaque response is unreadable and browsers pad it for quota accounting, so an estimate plus a quota guard is the honest way to keep the promise without risking the origin's storage.
- **Alternatives**: Fetching pictures with CORS (the host does not allow it); skipping pictures offline (the app is mostly pictures); a proxy server (violates the local-only constraint).

## Decision 6: Protect saved data
- **Decision**: The worker never reads or writes `localStorage` or the save-file store (it cannot reach `localStorage`) and uses only caches whose names start with `ygo-app-`, `ygo-api`, `ygo-images` or `ygo-meta`. The page asks `navigator.storage.persist()` once so the browser does not evict the site's storage under pressure.
- **Rationale**: FR-009. Eviction under storage pressure is the real way saved data could vanish; persistence is the standard protection.
- **Alternatives**: Doing nothing (best-effort storage can be cleared by the browser when the disk is low).

## Decision 7: Install button and install state
- **Decision**: `app-shell.js` listens for the browser's install offer, keeps it, and shows the button (`#installAppBtn`) only on the profile screen and the main menu; it hides it after installation, when already running as an installed app, and when the browser gives no offer. Where the browser cannot install (for example Firefox desktop), nothing is shown.
- **Rationale**: FR-002 as clarified; avoids nagging inside the work screens.
- **Alternatives**: A custom banner on every screen (clutter).

## Decision 8: Offline indicator and clear messages
- **Decision**: `app-shell.js` shows a slim fixed indicator ("Offline — saved data and kept cards still work") when the browser reports no connection and removes it when it returns. Actions that need the network (card search, a set not kept, the Duel Room link) keep their own specific messages; the Duel Room checks the connection before creating or joining a link and offers Retry, while practice alone stays available.
- **Rationale**: FR-005, FR-006, FR-010: honest, specific messages instead of failures.

## Decision 9: Offline card search
- **Decision**: When a card search (`cardinfo.php?fname=...`) cannot reach the network, the worker searches the kept card API answers for cards whose name contains the query and answers with those cards plus a marker header; the search screens read the marker and show "Offline results — the full database needs a connection". With no match the screens say so.
- **Rationale**: Clarified behavior (search the cards already seen); doing it in the worker means every search screen gets it through one hook.
- **Alternatives**: Per-screen offline logic (duplicated); a separate index (more storage and upkeep).

## Decision 10: Icons and manifest
- **Decision**: `manifest.webmanifest` at the root with `start_url` the profile screen, `scope` the app root, `display` standalone, theme and background color the app's dark background, and icons 192, 512 and a maskable 512 PNG plus an SVG; all paths relative so the app works from any folder or sub-address. The PNGs are produced once from one SVG by a headless browser and committed.
- **Rationale**: Installability needs those fields; relative paths keep it host-agnostic.
- **Alternatives**: Absolute paths (break under a sub-address); an icon font (not accepted).

## Decision 11: Worker code changes
- **Decision**: A changed `service-worker.js` installs and takes over by itself (`skipWaiting`, `clients.claim`), because it only changes how files are kept, never what a page runs; at activation it deletes cache names it does not recognize as referenced by the state.
- **Rationale**: The page-file consistency rule is protected by Decision 3, so the worker itself can update silently.
