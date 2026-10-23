# Quickstart: Validating the Installable, Offline-Ready App

Serve the repo root from `http://localhost:8000` (the dev server never caches, which is fine: the worker keeps its own copy) and use Chrome. Open DevTools → Application to inspect the worker, the caches and the manifest.

## Scenario 1: Install (US1)
1. Open the profile screen: the page offers install in the address bar and shows the "Install app" button; the same button is on the main menu, not in work screens.
2. Install, close the browser, start the app from the system: it opens in its own window with the name, icon and dark theme color.
3. Open the installed app: the button is gone.

## Scenario 2: Offline everywhere (US2)
1. Visit every screen once online (or wait for the first visit to finish).
2. DevTools → Network → Offline, reload each screen (profiles, menu, Run, Workshop, Store, Tools, Duel Room): every one opens, with the offline strip visible.
3. Cards and pictures seen before still show; an unseen card search shows "Offline results" with the cards kept so far and the note that the full database needs a connection; a pack from a set never loaded explains it needs a connection and changes nothing.
4. Clear all site data, go offline, open the app: it explains the first visit needs a connection.

## Scenario 3: Updates (US3)
1. Change any file (for example a text in a page), reload online: within the visit a notice "A new version is ready" appears with Reload.
2. Ignore it and keep working (open a pack, edit a deck): nothing reloads. Close all windows and open the app again: it is already the new version.
3. With two windows open, press Reload in one: the other shows "Reload to finish the update".
4. Interrupt a check (go offline mid-way): the old version keeps working; no half version is used.

## Scenario 4: Saved data (US4)
1. With profiles and a run, install, apply an update, then DevTools → Application → Cache Storage → delete the `ygo-app-*` caches.
2. Reload: the app files are fetched again and every profile, collection and run is identical.

## Scenario 5: Connection feedback (US5)
1. Go offline on any screen: the offline strip appears; go online: it disappears.
2. Duel Room → create or join a link while offline: "The link needs a connection" with Retry; practice alone still works; online, Retry works without reloading the page.

## Scenario 6: Size limit
1. Browse many cards online, then check Application → Storage: kept pictures and card data stay near or under 150 MB (picture sizes are estimates); the oldest are dropped first.

## Automated checks
- `shared/offline.test.js` (Node): every HTML page is in the worker's page list and has the manifest, theme color, icons and `app-shell.js`; the manifest is valid and its icon files exist with the right sizes.
- The contract tests include the pure rules in `offline-rules.js`.

## Verification record

Checked in headless Chrome (scratch scripts, not committed): install and offline pages, installability, kept card data and pictures, offline card search, budget eviction, staged update with Reload and with a single-window navigation, and clearing every app copy (files fetched again, saved data byte-identical).
