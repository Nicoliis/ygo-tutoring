# Data Model: Engines Panel in the Card Details Window

## Saved data (existing, unchanged shape)

- **Collection** (`ygoCollection`, per profile): `{ cards, engines, decks, trackers, … }`.
- **Engine**: `{ id, name, cards: [{ cardId, quantity }] }`. `cardId` is a collection card's `id`; `quantity` ≥ 1.

## New field

- **`savedEarly: true`** on a pulled card inside a saved pack: `run.box.pack.cards[i]` or `run.extraPack.pack.cards[i]`. Absent means "not saved early". On a draft pick, the same flag on the entry of `session.keptCards` (memory only).
  - Set once; never cleared.
  - Cards with `savedEarly` are skipped when the pack's (or draft's) cards are merged into the Backlog.
  - The pulled strip and "See pulled" list keep showing the card as usual.

## Constants (`shared/engine-rules.js`, `shared/card-engines.js`)

| Name | Value | Meaning |
|------|-------|---------|
| `ENGINE_SEARCH_MIN_COUNT` | 8 | Engines needed before the panel shows its name search |
| `ANNOUNCE_CLEAR_MS` | 4000 | How long a panel message stays before it clears |

(The per-engine copy limit stays `MAX_COPIES_PER_SECTION` = 3 in `collection-allocation.js`.)

## Pure rules (`shared/engine-rules.js`) over a collection blob

- `listEngines(collection)` → engines, newest first for display (new engines are added on top by the view).
- `copiesInEngine(engine, cardId)` → integer ≥ 0.
- `resolveOwnedCard(collection, card)` → collection card or `null` (by `id`, then `apiId`, then lower-cased name).
- `canAddCopy(collection, engineId, owned, extraAvailable)` → `{ ok, reason }`; allowed while `copiesInEngine < min(owned.quantityOwned + extraAvailable, 3)`.
- `addCopy(collection, engineId, cardId)` / `removeCopy(collection, engineId, cardId)` → change the blob in place, return the new count; removing the last copy drops the entry.
- `createEngineWithCard(collection, name, cardId, id)` → the new engine `{ id, name: trimmed, cards: [{ cardId, quantity: 1 }] }`, or `null` for an empty name.

## Derived panel state (per open window)

`{ owned: collectionCard | null, readOnlyReason: string | null, engines: [{ id, name, count, canAdd, addReason }], pull: { available: n } | null }`

- `readOnlyReason` is set when the card is not owned (and cannot be saved now), or for a draft card that has not been picked.
- `pull.available` is the number of unmarked identical pulled copies still in the pack (0 when the window is not a pull window).

## Validation rules

- A card never appears twice in one engine (entries are merged by `cardId`).
- An engine's count of a card never exceeds `min(quantityOwned, 3)` after any panel change.
- A pulled copy is merged into the Backlog at most once: either early (flagged) or at the pack's end.
- A failed write leaves both the collection and the run exactly as they were (or reverts the early save).
