# Phase 1 Data Model: Collection Bags & Deck Export

## OwnedCard (extended)

| Field | Type | Rule |
|---|---|---|
| `effect` | string or absent | **New.** The card's description/effect text, from the API's `desc` field. Populated the same way and at the same times as `type`/`level`/`atk`/`def`/`imageSmall`/`imageFull` — at add-time via search, or via this feature's backfill lookup. Absent until a successful lookup. |
| *(all existing fields)* | — | Unchanged. |

## Engine (simplified)

| Field | Type | Rule |
|---|---|---|
| `id` / `name` | string | Unchanged. |
| `cards` | array of `{cardId, quantity}` | Unchanged shape. **New rule**: MAY be empty (`[]`) — the ≥2-distinct-card minimum is removed entirely, for creation and thereafter. Composition changes only via drag-to-add (existing `addCardToEngine`) and drag-to-bin / non-drag-equivalent remove (existing `removeCardFromEngine`) — no bulk replace path is exposed to the UI anymore (the internal `updateEngine(id, {cards})` plumbing may still be reused by `addCardToEngine`, but nothing in the UI calls it with a user-edited full list). |

## Deck (restructured — breaking shape change, migrated on load)

| Field | Type | Rule |
|---|---|---|
| `id` / `name` | string | Unchanged. |
| `main` | array of `{cardId, quantity}` | **New.** Replaces part of the old `items` array. Quantity ≥ 1 per entry; a given `cardId` appears at most once (quantities merge). |
| `extra` | array of `{cardId, quantity}` | **New.** Same shape and rules as `main`, tracked independently. A card may appear in both `main` and `extra` simultaneously if the user deliberately put it in both (the system never prevents this — FR-009's "the system does not override or second-guess which section the user chose"). |
| ~~`items`~~ | — | **Removed.** No deck is ever written with this key again after migration. |

**Migration (run once per deck inside `loadCollection()`, before any render)**:

```text
for each parsed deck:
  if deck.main or deck.extra already exist: skip (already migrated)
  main = []
  for each old item in deck.items (or [] if missing):
    if item.type === "card":
      merge {cardId: item.cardId, quantity: item.quantity} into main
    if item.type === "engine":
      engine = find engine by item.engineId
      if engine found:
        for each ec in engine.cards:
          merge {cardId: ec.cardId, quantity: ec.quantity * item.copies} into main
      // engine not found: that reference is simply dropped (it already pointed at nothing)
  deck.main = main
  deck.extra = []
  delete deck.items
```

"Merge" means: if `cardId` already present in the target array, add to its `quantity`; otherwise
push a new entry.

## Engine-or-card drop onto a deck section (behavior, not a stored entity)

| Action | Effect |
|---|---|
| Drag a backlog card onto a deck's Main or Extra drop-zone | `addCardToDeckSection(deckId, section, cardId, 1)` — merges one copy into that section's array. |
| Drag an entire engine (bag) onto a deck's Main or Extra drop-zone | `addEngineToDeckSection(deckId, section, engineId)` — merges **every** card currently in that engine into that section's array, each at the engine's own per-card quantity. The engine itself is never referenced afterward; editing the engine later has no effect on decks it was already dropped into (FR-010). |
| Non-drag equivalent (deck item-adder control) | A card/engine picker plus an explicit Main/Extra choice, calling the same two functions above — required so every drag action keeps a keyboard-operable equivalent (Constitution Principle I). |

## Removal via drag-to-bin (behavior, not a stored entity)

| Context | Drag payload | Drop target | Non-drag equivalent |
|---|---|---|---|
| Remove a card from an engine | `application/x-bag-card-source`: `{cardId, source: {type: "engine", engineId}}` | The engine's visible bin, shown only while expanded | The existing small "✕" button on that card within the engine |
| Remove a card from a deck section | `application/x-bag-card-source`: `{cardId, source: {type: "deck", deckId, section}}` | That deck section's visible bin, shown only while expanded | The existing small "✕" button on that card within the section |

Neither removal needs a confirmation modal (spec Assumptions) — nothing persisted to the backlog is
affected; both act immediately. A card dragged onto a *different* bag's add-zone (rather than a
bin) is interpreted as an add-drag (`text/plain` payload), not a remove — the two gestures read
disjoint `dataTransfer` types so they can never be confused (research.md).

## Bag collapse/expand (session-only UI state, never persisted)

| Name | Shape | Purpose |
|---|---|---|
| `expandedEngines` / `expandedDecks` | `Set` of ids | Unchanged collections from before this feature — now driven by a click anywhere on the bag's header/body area (FR-006/FR-007) instead of a small dedicated toggle button. Collapsed renders only the name (plus the always-visible Delete, and for engines the rename-only Edit); expanded additionally renders the card-tag-list (or Main/Extra sections, for a deck) and the bin. |

## Backfill lookup (session-only UI state, never persisted)

| Name | Shape | Purpose |
|---|---|---|
| `lookupAttempted` | `Set` of card ids | Tracks which backlog cards have already had a backfill lookup attempted (success or failure) during this page load — added to *before* the fetch resolves, so a failure is never retried (FR-003). Cleared only by a page reload. |

## YDK Export/Import Text (not a stored entity — a Deck representation)

```text
#created by YGO Proxy Sheet Builder
#main
<apiId>          one line per copy, in deck.main order
...
#extra
<apiId>          one line per copy, in deck.extra order
...
!side
```

- **Export**: built from the target deck's `main`/`extra` arrays; a card with no stored `apiId` is
  skipped from the output and listed in a warning (symmetry with Import's own skip behavior).
- **Import**: parsed into `{main: [apiId...], extra: [apiId...]}`; each `apiId` is matched against
  `collection.cards` (by its own `apiId` field) — a match merges into the new section array
  (quantity = occurrence count), a non-match is recorded and reported, never fetched (FR-016).
  Successfully parsed sections **replace** the target deck's `main`/`extra` entirely (spec
  Assumptions — import replaces, it doesn't merge with what was already there).
