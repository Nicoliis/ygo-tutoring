# Phase 1 Data Model: YGO Set Pack Simulator

No new persisted entity and no change to the shared `localStorage` blob's shape (see the
Progression Series Pack Puller's `data-model.md`). This feature adds **session-only, in-memory**
state and one new way to produce an existing `Pull`.

## Session-only state (never persisted)

| Name | Shape | Lifetime |
|---|---|---|
| `allSetsCache` | array of `{ name, releaseDate }`, sorted ascending by `releaseDate` | Fetched once on first use of the set picker; kept in memory for the page's lifetime; cleared on reload. |
| `setCardPoolCache` | `Map<setName, Array<{ name, weight }>>` | Populated on first simulated pull (or first set selection) per distinct set name; reused for every later pull from that same set in the same session; cleared on reload. |
| `selectedSetName` | string or null | The page-wide "currently selected set" for simulated pulls; set when the user picks one from the picker; not persisted. |

**Validation**:
- `allSetsCache` entries with a missing/unparseable release date are sorted after all dated
  entries (oldest-first ordering still applies to everything that has a real date).
- `setCardPoolCache` is only populated from a **successful** fetch; a failed fetch leaves no
  entry, so the next attempt retries rather than caching a failure.

## Weighted card pool entry

Derived once per set (from the raw API response) and cached as `setCardPoolCache`'s value:

| Field | Type | Rule |
|---|---|---|
| `name` | string | The card's name, exactly as returned — this is what gets written into a `Pull`'s `cardNames` and, from there, the shared Backlog, so it matches names already used elsewhere in this app for the same cards. |
| `weight` | number | Derived from the card's `card_sets` entry whose `set_name` matches the selected set (research.md); looked up in a small fixed rarity→weight table; falls back to the Common-tier weight if no usable rarity is found. |

**Rarity → weight table** (approximate, not official odds — see spec Assumptions):

| Rarity (case-insensitive match on `set_rarity`) | Weight |
|---|---|
| Common (and anything unrecognized/missing) | 10 |
| Rare | 3 |
| Super Rare | 1.5 |
| Everything else (Ultra Rare, Secret Rare, Ultimate Rare, Ghost Rare, etc.) | 1 |

## Simulated Pull (not a new entity — a new way to fill an existing one)

A simulated pull reuses the Progression Series Pack Puller's `Pull` shape (`{ id, cardNames }`)
exactly. The only difference from a manual pull is how `cardNames` is produced:

1. Resolve `selectedSetName`'s weighted pool (from cache, fetching + caching it first if absent).
2. Draw `packCount × 9` cards **with replacement**, each draw independently weighted by the pool
   entries' `weight` (data-model.md Weighted card pool entry; duplicates within one draw are
   expected and valid — a common can legitimately be pulled more than once).
3. Pass the resulting array of names into the exact same pull-logging path `tracker.js` already
   has (the one manual entry uses) — same Backlog effect (FR-005), same tracker-progress effect
   (FR-006), with no special-casing needed downstream, since a `Pull` doesn't record *how* its
   `cardNames` were produced.

**Validation**: `packCount` must be a positive integer (FR-003); a request with no set selected,
or a `packCount` that is zero/negative/non-numeric, is rejected before any fetch is attempted,
with a clear message — mirroring the existing "enter at least one card name" validation already
established for manual pulls in `tracker.js`.

## UI state additions (not persisted, drive rendering only)

| Name | Purpose |
|---|---|
| `setPickerOpen` (boolean) | Whether the page-level set-picker section is expanded — mirrors the existing `expandedTrackers`/engine-form collapse pattern; collapsed by default. |
| `setPickerFilter` (string) | The in-memory text filter applied to `allSetsCache` for the picker's search box; purely client-side, no network cost per keystroke (research.md). |
| `isFetchingSets` / `isFetchingSetPool` (booleans) | Drive the loading-state UI (Constitution Principle I — visible feedback) while either fetch is in flight; both the set picker and every tracker's "Simulate pull" button are disabled while their relevant fetch is in progress. |

## Error handling

A failed fetch (network error, non-OK response, or an empty/unrecognized result) at either stage:
- Sets `isFetchingSets` / `isFetchingSetPool` back to `false`.
- Shows a clear, user-facing message (e.g. "Couldn't load the set list — check your connection
  and try again.") via the same `alert`-based pattern already used for validation errors
  elsewhere in `tracker.js`.
- Leaves `allSetsCache` / `setCardPoolCache` / the shared Backlog / every Tracker **exactly** as
  they were before the attempt (FR-008, US3) — nothing partial is ever written.
