# Phase 1 Data Model: Workshop, Store & Segregated Menu

No new storage keys. Extends existing records; all new fields are optional on read.

## Printing (inside `card.printings`, from spec 010) — new field

| Field | Type | Rule |
|-------|------|------|
| `setCode` | string \| absent | The set code of the pulled card (e.g. `LOB-EN001`), recorded at the first pull of the printing that has one; shown in the Store. |
| `setPrice` | integer cents ≥ 1, or absent | The card data price for that card in that set, recorded at the first pull of the printing that has one (a later pull fills it in if the printing had none yet); absent means the copy sells for 0.01. At pull time the value is the set price, else the Cardmarket price, else 1 (so new pulls always carry one). Never changed once set. |

Existing fields (`set`, `rarity`, `price`, `quantity`) are unchanged. Cards pulled before this feature have printings without `setPrice` and "unknown" copies: neither can be sold.

## Pulled card (transient) — new field

`setPrice` (integer cents or `null`), copied from the pool entry into the printing at merge time.

## Run record additions (`ygoRun_<profileId>`)

| Field | Type | Rule |
|-------|------|------|
| `balanceCents` | integer ≥ 0 | Run money; starts at 0 when absent; never negative |
| `boosterBuys` | `{ [setName]: integer ≥ 0 }` | Number of times each booster has been bought in this run; never reset |
| `packInventory` | `{ [setName]: integer ≥ 0 }` | Bought, unopened packs per set |
| `extraPack` | `{ setName, pack: { cards, revealed } } \| null` | A bought pack being opened (same shape as `box.pack`); `null` when none |

### Derived values (never stored)
- **Next price** of a booster = `priceForPurchase(boosterBuys[setName] || 0)`.
- **Reached boosters** = `completed` stages plus `current`, in `MAINLINE_BOOSTERS` order.
- **Total for n packs** = sum of `priceForPurchase(k)` for k = buys … buys+n−1.

### Pricing rule (`shared/money.js`)

```
priceForPurchase(k)  = round_half_up(100 × 1.5^k)       // cents; k = 0 is the first purchase
totalForPurchases(k, n) = Σ priceForPurchase(k + i), i = 0..n−1
```

Examples: 100, 150, 225, 338, 506, … so buying 3 from fresh costs 475 (4.75) and the next price is 338 (3.38).

### State transitions

```
sell(printing):   requires printing.setPrice and printing.quantity ≥ 1 and (sandbox-free: run exists)
                  -> printing.quantity −= 1 (remove the printing at 0), card.quantityOwned −= 1,
                     balanceCents += printing.setPrice, clamp engine/deck groups to maxAllowedInGroup
buy(setName, n):  requires setName reached, n ≥ 1 integer, balanceCents ≥ totalForPurchases(buys, n)
                  -> balanceCents −= total, boosterBuys[setName] += n, packInventory[setName] += n
openBought(set):  requires packInventory[set] ≥ 1 and extraPack = null
                  -> generate the pack FIRST; only if that succeeds, in one write:
                     extraPack = { setName, pack } and packInventory[set] −= 1 (on failure nothing changes)
extraPack done:   merge cards into backlog, then extraPack = null
```

## Workshop data (unchanged)

`ygoCollection[_id]`: `cards[]` (with `printings`), `engines[]`, `decks[]` keep their current shape; screens only re-arrange how they are shown.

## Area table (code constant, not stored)

`AREAS = [{ id, label, theme, pages: [{ label, href }] }]` with ids `run`, `workshop`, `store`, `tools`.
