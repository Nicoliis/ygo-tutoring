# Phase 1 Data Model: Pack Opening Experience & Pull History

No new storage keys. Extends existing records; all new fields are optional on read.

## Owned card (in `ygoCollection[_<profileId>]` → `cards[]`)

Existing fields unchanged (`id`, `name`, `quantityOwned`, `apiId`, `type`, images, …). New optional field:

| Field | Type | Rule |
|-------|------|------|
| `printings` | array of Printing | Absent on cards saved before this feature |

### Printing

| Field | Type | Rule |
|-------|------|------|
| `set` | string | Set name the copy was pulled from; non-empty |
| `rarity` | string \| null | Rarity name as given by the provider for that set; `null` = unknown |
| `price` | number ≥ 0 | Price at the first pull of this printing; never updated afterwards |
| `quantity` | integer ≥ 1 | Copies owned of this exact printing |

**Identity**: (`set`, `rarity`) pair within a card. A new pull with the same pair increments `quantity`; a different pair adds a new Printing.

**Invariant**: `quantityOwned ≥ sum(printings[].quantity)`. The difference (if any) is "unknown printing" copies from before this feature. Removing copies elsewhere in the app only changes `quantityOwned`; printings are trimmed from the least-recent entries so the invariant holds.

## Pulled card (transient, inside a pack)

| Field | Type | Description |
|-------|------|-------------|
| `name`, `apiId`, `type`, `imageSmall`, `imageFull`, `level`, `atk`, `def` | as today | Same fields the pool already provides |
| `set` | string | Set the pack belongs to |
| `rarity` | string \| null | Rarity in that set |
| `price` | number | Price at pull time |

## Run state additions (`ygoRun_<profileId>`)

| Field | Type | Description |
|-------|------|-------------|
| `box` | object | Absent on old runs (treated as the empty box below) |
| `box.packsOpened` | integer 0–24 | Packs fully revealed and merged |
| `box.pack` | object \| null | The pack in progress |
| `box.pack.cards` | Pulled card[] | Sorted rarity ascending (common first, rarest last); ties by price ascending |
| `box.pack.revealed` | boolean[] | Same length as `cards` |
| `box.pulled` | Pulled card[] | All cards revealed so far in this box (feeds the pulled strip and "See pulled") |

Existing `boxOpened` becomes `true` when `box.packsOpened === 24` (a run saved with `boxOpened: true` before this feature stays opened).

### Pack state machine

```
no pack  --[Open pack / Next pack, packsOpened < 24]--> pack face down (revealed all false)
pack     --[reveal card i]--> revealed[i] = true, card appended to box.pulled
pack     --[last card revealed]--> merge pack into backlog; packsOpened += 1; pack = null
pack empty, packsOpened < 24  --> action slot shows "Next pack"
pack empty, packsOpened = 24  --> action slot shows "See pulled"; boxOpened = true
```

## Stage picture state (derived, never stored)

| State | Rule |
|-------|------|
| opened (darkened) | Stage in `completed`, or it is `current` and `boxOpened` |
| next (clean) | Stage is `current` and not `boxOpened` |
| locked (light gray) | Any later stage |
