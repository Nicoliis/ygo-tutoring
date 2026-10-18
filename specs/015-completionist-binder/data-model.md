# Data Model: Completionist Binder

No stored data changes. The page reads the saved collection and run and writes nothing.

## Constants

| Where | Name | Meaning |
|-------|------|---------|
| `shared/set-slots.js` | `UNMATCHED_NOTE_MIN` = 1 | Fewest unmatched copies that shows the note |
| `shared/set-slots.js` | `PERCENT_DIGITS` = 0 | Decimals in the progress percentage |

(The binder layout constants stay in `collection/binder-paging.js`.)

## Slot (built from the card database)

`{ key, apiId, name, setName, setCode, rarity, card }`

- `key`: `"<apiId>|<rarity lower-cased>"`, unique within a set. `setCode` is the English number when the printing has regional numbers (LOB-001, LOB-E001, LOB-EN001), else the first one.
- `card`: the card fields (`extractCardFields`) plus `name` and `effect` (from `desc`), so the details window can open for a card the user does not own.
- Order: by the numeric end of `setCode`, then `setCode`, then `rarityRank(rarity)` ascending, then `name`.
- A card makes one slot per rarity it has in the set; its regional set numbers do not make extra slots.

## Ownership (derived from the saved collection)

`ownedFor(slot, collectionCards) -> integer ≥ 0`

A printing of the matching collection card counts when:
- same card (`apiId` equal when both present, otherwise names equal ignoring case), and
- `printing.set === slot.setName`, and
- rarities equal ignoring case. (The recorded set number is ignored: any regional number of the printing counts.)

Owned copies = sum of `printing.quantity` of matching printings. Missing = 0.

## Completion (derived)

`{ owned, total, percent, complete }`

- `total` = number of slots; `owned` = slots with ownership ≥ 1.
- `percent` = `round(100 × owned / total)` (0 when `total` is 0).
- `complete` = `total > 0 && owned === total`.

## Unmatched copies (derived, whole collection)

`unmatchedCopies(collectionCards)` = for each card: `max(0, quantityOwned − Σ printing.quantity)` plus the quantities of printings with no set or no rarity.

## In-memory state (`workshop/completionist-state.js`)

- `availableSets`: array of set names, most recent first.
- `chosenSet`: string or `null`.
- `slotsBySet`: Map `setName → slots` (session cache; failures are not stored).
- The binder offset lives in the shared binder controller; switching sets resets it.

## Validation rules

- Every card and rarity of the chosen set yields exactly one slot; regional set numbers of one printing never make a second slot.
- A slot is owned only through a matching recorded printing; unmatched copies never colour a slot.
- Choosing a set never changes saved data.
