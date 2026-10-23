# Implementation Plan: Installable, Offline-Ready App

**Branch**: `021-installable-offline-app` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/021-installable-offline-app/spec.md`

## Summary

Make the static app installable and fully usable offline with plain browser features and no build step:

1. **Install**: a web app manifest (name, icons, colors, standalone window) and an "Install app" button on the profile screen and the main menu.
2. **Offline copy**: one `service-worker.js` at the app root keeps a complete, versioned copy of the app's own files (288 small files, about 1.9 MB). The list of what to keep is discovered from a hand-kept list of the pages, by reading each page's scripts, styles and images, so no generated manifest is needed and nothing can be left out silently (a test checks the page list).
3. **Safe updates**: a new version is downloaded in full into a separate staged copy, the user is told and chooses Reload, and the copy is swapped in one step. With a single window open, the swap also happens by itself on the next navigation, so nobody stays on an old version.
4. **Card data offline**: the card API answers are kept network-first and reused when offline; card pictures are kept within a 150 MB budget (oldest first). While offline the card search looks through the kept data and labels the results "offline results".
5. **Feedback**: an offline indicator on every screen, clear messages for actions that need a connection, and a Duel Room link that says it needs a connection.

Saved data is never touched: the service worker only uses the browser's Cache Storage, never `localStorage` or the save-file store, and the app also asks the browser to treat the site's storage as persistent.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020); one service worker script; no build step

**Primary Dependencies**: None. Browser features: Cache Storage, service workers, the install prompt, `navigator.storage`

**Storage**: Cache Storage only for app files and kept card data (caches named `ygo-app-<version>`, `ygo-api`, `ygo-images`, `ygo-meta`); saved data stays in `localStorage` and the existing save-file store, untouched

**Testing**: Pure logic (page list check, cache budget and eviction rules, offline search over kept data, version hashing) as Node contract tests in the existing runner; real behavior (install, offline, update, quota) validated manually with Chrome through quickstart.md; an automated headless-Chrome smoke check is added for the offline copy

**Target Platform**: Chromium browsers and Safari/Firefox without the install button where unsupported; secure address or localhost

**Project Type**: Static multi-page web app

**Performance Goals**: Offline screens open in under 2 s; first-visit copy of the app files completes in the background without blocking use

**Constraints**: Cross-origin card pictures (`images.ygoprodeck.com`) send no CORS headers, so they can only be kept as opaque responses: their real size cannot be read and the browser counts each against its quota with padding; the 150 MB limit is therefore an estimate for pictures and exact for card data. App-file version checks are conditional requests to the app's own host, made at start and when the window regains focus after 30 minutes, never on a timer

**Scale/Scope**: 19 pages, 288 files, up to a few thousand kept card pictures

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Offline indicator, plain-language messages, an update notice with a Reload action, install button only where it helps, keyboard-operable and labelled controls. |
| II. Minimal API Footprint | Pass. Caching card data and pictures lowers calls to the card API; no polling or speculative prefetch of the API. The only new traffic is conditional requests for the app's own static files (start and refocus), which Principle II (about the card API and the Duel Room link) does not cover; documented in research.md. |
| III. Maintainability & Simplicity | Pass. One service worker, one app-shell script, no build step, no generated manifest (self-discovery from a checked page list). |
| Additional Constraints (local data only) | Pass. Everything is stored in the browser; nothing new is sent anywhere. The persistent-storage request protects saved data from eviction. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/021-installable-offline-app/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── service-worker-and-app-shell.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
manifest.webmanifest        # NEW: name, icons, colors, standalone, start page
service-worker.js           # NEW: app copy, staged updates, kept card data, offline search
offline.html                # NEW: the page shown for an address that was never kept
icons/                      # NEW: icon-192.png, icon-512.png, icon-maskable-512.png, icon.svg, apple-touch-icon.png

shared/
├── app-shell.js            # NEW: registers the worker, install button, offline indicator, update notice, messages
├── app-shell.css           # NEW: indicator, notice and install button styles
├── offline-rules.js        # NEW (pure, shared by worker and tests): cache budget, eviction, offline card search, version hash input
└── offline.test.js         # NEW (Node): page list, page tags, manifest and icons checks

index.html, menu.html       # CHANGED: install button
*/**/*.html (18 pages)      # CHANGED: manifest link, theme color, icons, app-shell script
collection/collection-run-search.js, proxy-builder/proxy-run-search.js   # CHANGED: show "offline results"
duel/duel-room.js           # CHANGED: say a connection is needed for the link when offline
```

**Structure Decision**: Everything the worker needs sits at the app root (a worker controls only its own folder and below), shared logic lives in `shared/offline-rules.js` so the worker and the tests use the same code, and pages only gain tags, the install buttons and the small "offline results" and duel messages.

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|------|------------|--------------------------------------|
| Staged update copy instead of "refresh on next load" | Keeps every page on one consistent version and lets the user choose when to reload (FR-007, FR-008, FR-011) | A plain stale-while-revalidate would mix old and new files in one page |
| Estimated size for cross-origin pictures | Their bodies cannot be read (no CORS) | Reading sizes is impossible; counting entries by assumed size keeps the 150 MB promise honest |
