# Phase 1 Data Model: Draft Collection Manager

Three entities, persisted together as one JSON document in `localStorage` (see `research.md`).
No entity has a lifecycle/status field; all are plain CRUD records with derived values computed
at read time.

## OwnedCard

Represents a card the user owns, logged from a draft session.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Generated on creation; stable identity for references from Engine/Deck. |
| `name` | string | Required, non-empty after trim. Maps to spec FR-001. |
| `quantityOwned` | integer | Required, ≥ 0. Increment/decrement per FR-002. |

**Derived (not stored)**:
- `quantityAllocated` = sum of this card's quantity across all Engine `cards` entries, plus the
  sum of this card's quantity across all direct Deck `items` entries of type `card` (see
  research.md "Allocation counts are computed, not stored"). Engine quantities referenced
  *through* a deck are not double-counted again here — see Deck below.
- `quantityAvailable` = `quantityOwned` − `quantityAllocated`. May be negative; a negative value
  is surfaced in the UI as a warning (over-allocated), per the spec's Assumptions (soft warning,
  not a hard block) and FR-008.

**Deletion**: Deleting an OwnedCard that is referenced by any Engine or Deck prompts a
confirmation listing how many engines/decks reference it (Usability First); on confirmation, the
reference is removed from those engines/decks rather than left dangling.

## Engine

A user-named, reusable bundle of backlog cards representing a recognized synergy package (e.g.
"the progression series").

| Field | Type | Rules |
|---|---|---|
| `id` | string | Generated on creation; referenced by Deck items. |
| `name` | string | Required, non-empty after trim. Maps to spec FR-004. |
| `cards` | array of `{ cardId, quantity }` | Must contain **at least 2** distinct `cardId` entries (FR-004). Each `quantity` is an integer ≥ 1. Each `cardId` MUST reference an existing OwnedCard. |

**Validation**: Rejecting a save with fewer than 2 card entries, or with a non-existent
`cardId`, or with `quantity < 1`.

**Editing**: Renaming or changing `cards` on one Engine MUST NOT alter any other Engine or any
Deck that references it by `id` — a Deck holds a reference to the Engine's `id`, so a later edit
to the Engine's `cards` is reflected live wherever that Engine is used (this is the "reusable
package" behavior the spec calls for, not a copy-on-use).

## Deck

A user-named construction built from OwnedCards and/or Engines, exportable as a flat card list.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Generated on creation. |
| `name` | string | Required, non-empty after trim. Maps to spec FR-006. |
| `items` | array of `{ type: 'card', cardId, quantity }` \| `{ type: 'engine', engineId, copies }` | `quantity`/`copies` are integers ≥ 1. `cardId`/`engineId` MUST reference an existing OwnedCard/Engine. |

**Derived (not stored, used only for export/display)**:
- `resolvedCardList`: flattening every `items` entry into a single `{ cardId, name, quantity }`
  list — `type: 'card'` entries contribute `quantity` copies of that card; `type: 'engine'`
  entries contribute, for each card in that Engine, `engineCardQuantity × copies`. Entries for
  the same `cardId` are summed into one line. This flattened list is exactly what gets written
  out on export (FR-009).

**Independence**: Editing or deleting one Deck MUST NOT alter any other Deck, any Engine, or any
OwnedCard's `quantityOwned` (FR-011) — only the derived allocation numbers shift, since they are
recomputed from whatever Decks/Engines currently exist.

**Deletion**: Deleting a Deck requires confirmation (Usability First) but has no cascading
effect on Engines or OwnedCards — it only removes that Deck's contribution to the allocation
totals.

## Top-level persisted shape

```json
{
  "cards": [ { "id": "...", "name": "...", "quantityOwned": 0 } ],
  "engines": [ { "id": "...", "name": "...", "cards": [ { "cardId": "...", "quantity": 1 } ] } ],
  "decks": [ { "id": "...", "name": "...", "items": [ { "type": "card", "cardId": "...", "quantity": 1 } ] } ]
}
```

This single object is the entire `localStorage` payload for the feature (one key, consistent
with the existing `ygoDeck` precedent in `app.js`).
