# Contract: Service Worker and App Shell

Internal contracts between the pages, the worker and the tests. No new network endpoints; all fetches are to the app's own files and the existing card database and picture hosts.

## `manifest.webmanifest`

| Field | Value |
|-------|-------|
| `name` / `short_name` | "YGO Tutoring Toolkit" / "YGO Toolkit" |
| `start_url`, `scope`, `id` | `./index.html`, `./`, `./` (relative, host-agnostic) |
| `display` | `standalone` |
| `theme_color`, `background_color` | the app's dark background (`#14161c`) |
| `icons` | 192 PNG, 512 PNG, 512 maskable PNG, and an SVG; all files must exist |

Every page contains `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="icon">`, `<link rel="apple-touch-icon">` and loads `shared/app-shell.js` (a Node test checks this).

## `service-worker.js`

| Behavior | Rule |
|----------|------|
| Scope | The app root; registered by `app-shell.js` with a path relative to the page |
| Install | Discovers the files from the page list, stores them all in `ygo-app-<version>`, then writes `state.current`; fails as a whole if any file cannot be stored (nothing becomes current) |
| Fetch: app files and pages | Answered from the current copy only; a miss goes to the network; an address never kept and no network → `offline.html` |
| Fetch: card data (GET, card database host) | Network first; a good answer is kept (`ygo-api`) and used when the network fails; `cardinfo.php?fname=` with no network → offline results (below) |
| Fetch: pictures (picture host) | Cache first; otherwise fetched with no-cors and kept (`ygo-images`) |
| Budget | After each keep, remove the oldest kept entries until `apiBytes + imageEstimate` ≤ 150 MB; also the quota guard (usage > 80% of quota → remove oldest pictures until ≤ 70%); a failed keep (quota) is ignored and the request still succeeds |
| Check | On `check`: fetch every discovered file with revalidation, hash, compare with `state.current`; different → store the new copy, set `state.staged`, send `update-ready`; same → set `checkedAt` |
| Apply | On `apply` (or a navigation with ≤ 1 window open and a staged version): `current = staged`, `staged = null`, delete other `ygo-app-*` caches, send `applied` |
| Never | Read or write anything outside the caches named in data-model.md |

### Offline results

For a failed `…/cardinfo.php?fname=<text>`, the answer is `{ "data": [cards whose name contains <text>] }` built from the kept card data (deduplicated by card id, at most 50, name order), with the response header `x-ygo-offline: 1`. With no match: `{ "data": [] }` and the same header.

## `shared/app-shell.js` (loaded by every page)

| Behavior | Rule |
|----------|------|
| Register | Registers the worker; runs a check at start and when the window regains focus after ≥ 30 minutes |
| Persist | Asks `navigator.storage.persist()` once per visit (no UI) |
| Install button | Keeps the browser's install offer; shows `#installAppBtn` only where the page has one (profile screen, main menu) while an offer exists; hides it after install, when already installed (standalone) and when there is no offer |
| Offline indicator | `role="status"` strip shown while the browser reports offline, removed when online; text "Offline — saved data and kept cards still work" |
| Update notice | On `update-ready` shows a notice "A new version is ready" with a Reload button (sends `apply`, then reloads on `applied`); if the user does nothing, nothing happens |
| Other windows | On `applied` from another window, shows "Reload to finish the update" |
| API | `isOffline()` for the screens; `isOfflineResponse(response)` reading `x-ygo-offline` |

## Screens

| Screen | Change |
|--------|--------|
| Card search (Backlog add, Proxy Builder) | When `isOfflineResponse(response)`, show "Offline results — the full database needs a connection" with the result count |
| Duel Room | Before creating or joining a link: if `isOffline()`, show "The link needs a connection" with Retry; practice alone is unaffected |

## `shared/offline-rules.js` (pure; used by the worker and the tests)

`estimateImageSize(url)`, `pickEvictions(entries, limit)` (oldest first until under the limit), `searchKeptCards(answers, text)` (the offline results), `versionOfFiles(hashesByAddress)`, `discoverFiles(pageHtml, pageAddress, readCssUrls)`.

## Backward-compat rules
- Saved data, keys and files are never touched.
- A browser without service workers or install support runs the app exactly as today; `app-shell.js` degrades silently.
