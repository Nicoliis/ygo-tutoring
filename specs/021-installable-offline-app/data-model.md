# Phase 1 Data Model: Installable, Offline-Ready App

No saved-data changes. Everything below lives in the browser's Cache Storage and in memory.

## Caches

| Cache | Content | Lifetime |
|-------|---------|----------|
| `ygo-app-<version>` | One complete copy of the app's own files (pages, scripts, styles, icons, images) | Exactly one referenced as current; at most one more staged; all others deleted |
| `ygo-api` | Last good answer per card-data request address (JSON) with the time it was kept and its exact size | Oldest removed first when the shared budget is exceeded |
| `ygo-images` | Card and set pictures (opaque) with the time kept and an estimated size | Oldest removed first when the shared budget is exceeded or the quota guard trips |
| `ygo-meta` | One entry `state` (below) and one entry `budget` | Rewritten as the others change |

## State (`ygo-meta` → `state`)

| Field | Type | Rule |
|-------|------|------|
| `current` | string | Version of the copy that serves the app; always names an existing, complete cache |
| `staged` | string \| null | Version fully stored and waiting; `null` when none |
| `checkedAt` | number | Time of the last finished check (ms), used for the 30-minute refocus rule |

Transitions: `none → current` (first install, after every file is stored) · `current → staged` (a check found a different version and finished storing it) · `staged → current` (applied by Reload or by a navigation with at most one window; the old copy is deleted) · an interrupted store leaves `current` and `staged` unchanged and the half-built cache is deleted at the next check.

## Budget (`ygo-meta` → `budget`)

| Field | Type | Rule |
|-------|------|------|
| `apiBytes` | integer | Sum of the exact sizes of the entries in `ygo-api` |
| `imageEstimate` | integer | Sum of the estimated sizes of the entries in `ygo-images` |
| `limit` | integer | 150 × 1024 × 1024 bytes for `apiBytes + imageEstimate` |

Size estimates by picture kind: small card picture (`/cards_small/`) 30 KB, full card picture (`/cards/`) 150 KB, set picture (`/sets/`) 50 KB, anything else 50 KB.

## Entry metadata (response headers added when an entry is kept)

| Header | Meaning |
|--------|---------|
| `x-ygo-kept-at` | Time the entry was kept (ms); defines "oldest" |
| `x-ygo-size` | Exact size (card data) or estimated size (picture) in bytes |

## Messages between page and worker

| From | Message | Meaning |
|------|---------|---------|
| page | `{ type: "check" }` | Run an update check now |
| page | `{ type: "apply" }` | Make the staged version current and reply `applied` |
| page | `{ type: "status" }` | Ask for `{ current, staged }` |
| worker | `{ type: "update-ready", version }` | A new version is staged |
| worker | `{ type: "applied", version }` | The current version changed; windows must reload to finish |

## Derived (never stored)

- **Page list**: the pages named in `service-worker.js`, compared by a test with the HTML files in the repository.
- **Discovered files**: addresses read from the pages and their stylesheets.
- **Version**: hash of the sorted discovered file contents.
- **Offline results**: kept card data whose name contains the search text.
