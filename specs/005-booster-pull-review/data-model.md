# Phase 1 Data Model: Booster Pull Review

No change to any persisted entity (`OwnedCard`, `Engine`, `Deck`, `Tracker`, `Pull`). This feature
adds only session-only, in-memory state to `tracker.js`, plus richer (but still session-only)
fields on the existing card-pool cache.

## Set card pool entry (extended, session-only — `setCardPoolCache`)

| Field | Type | Rule |
|---|---|---|
| `name` | string | Unchanged — the card's name, used for the weighted draw and as the backlog merge key on Save. |
| `weight` | number | Unchanged — derived from the matched set's rarity (`getWeightForRarity`). |
| `apiId` | number | **New.** The external database's own card id, from the same `cardinfo.php?cardset=` response already fetched. |
| `type` | string or absent | **New.** E.g. "Normal Monster", "Spell Card" — drives which detail fields apply, same rule as `collection.js`'s `OwnedCard.type`. |
| `level` / `atk` / `def` | number or absent | **New.** Monster-type only; absent for Spell/Trap, matching `collection.js`'s identical rule for `OwnedCard`. |
| `imageSmall` / `imageFull` | string (URL) or absent | **New.** `imageSmall` for the minicard's thumbnail (if shown), `imageFull` for the detail modal. |

**Validation**: Unchanged from today — a pool entry always has `name` and `weight`; the new fields
are populated whenever the source API response includes them (effectively always, since the pool
itself is built from real database cards) and are simply absent if a given field isn't present in
that response (e.g. a Spell/Trap's `level`/`atk`/`def`).

## Pending Pull (new, session-only — never persisted)

| Field | Type | Rule |
|---|---|---|
| `setName` | string | Snapshot of the set this pull was drawn from, captured at draw time — independent of the page's (shared) `selectedSetName`, which may change afterward. |
| `packCount` | number | Snapshot of the pack count this pull was drawn with — reused verbatim by Reattempt. |
| `packs` | array of array of Pulled Card | One entry per pack, each an array of `CARDS_PER_PACK` Pulled Cards — same grouping `drawSimulatedPull` already produces today, preserved so Save can still log one `Pull` per pack (data-model precedent: feature 003's `packsOpened` undercounting fix). |

Held in `const pendingPulls = new Map()`, keyed by tracker id — **at most one entry per tracker**
(FR-007). Cleared (by deleting that tracker's entry) on Save, Discard, or when the tracker itself
is deleted.

## Pulled Card (rendering concept, drawn from a pool entry)

The same shape as an extended set-card-pool entry, minus `weight` (irrelevant once drawn): `name`,
plus `apiId`/`type`/`level`/`atk`/`def`/`imageSmall`/`imageFull` when available. Rendered as:

- **Minicard** (collapsed): a small `<button>` showing `imageSmall` — or the card's name as text
  when no image is available — with the name always set as the button's accessible name
  (`aria-label`/image `alt`). A pending pull's minicards are rendered sorted alphabetically by
  name (FR-010), independent of which pack each card was drawn into — the sort is applied only to
  the flattened display list, never to `packs` itself.
- **Detail view** (on click): opens the existing `showModal` with `imageFull` (or a "no image
  available" placeholder) and every known field (`type`, `level`, `atk`, `def`) — or a graceful
  "no further details available" fallback if nothing beyond the name was captured (FR-009).

## Action semantics

| Action | Effect |
|---|---|
| **Save** | For each pack in `packs`, call the existing `logPull(trackerId, pack.map(c => c.name).join("\n"))` unchanged — this both adds each card to the backlog via the existing `addOrIncrementCard` merge rule and appends one `Pull` entry per pack. Then clear the tracker's pending pull. |
| **Discard** | Clear the tracker's pending pull. No other effect. |
| **Reattempt** | Using the pending pull's own `setName`/`packCount` (not the live global selection), perform a brand-new weighted draw from the same (already-cached) pool, and replace the tracker's pending pull with the new result. |

While a tracker has a pending pull, its "Simulate pull" control is disabled (FR-007); its manual
"Log pull" textarea is unaffected (spec Assumptions — out of scope).
