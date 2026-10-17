# Contract: Shared Pack Reveal & Rarity Modules

Internal client-side contracts. No network endpoints are added.

## `shared/rarity.js`

| Function | Behavior |
|----------|----------|
| `getRarityGlow(rarity)` | Unchanged behavior (moved from `draft/`): returns the matching glow tier or the default (common) |
| `rarityRank(rarity)` | Integer; higher = rarer (rank 0 = common/default). Unknown/`null` rarity = 0. Sort packs by rank ascending so the rarest card is last |
| `rarityLabel(rarity)` | The provider's rarity string, or `"Unknown rarity"` |
| `sortPackByRarity(cards)` | Returns a new array, common first and rarest last (rank ascending, ties by price ascending); used by both the Progression Run and the Draft before calling `createPackReveal` |
| `applyRarityGlow(el, rarity)` | Sets the glow CSS variable/class on an element (replaces inline logic in draft render code) |
| `buildRarityBadge(rarity)` | Returns an element with class `rarity-badge` and the explicit rarity name as text |

## `shared/printings.js` (pure)

| Function | Behavior |
|----------|----------|
| `addPrinting(card, { set, rarity, price })` | Increments quantity of the matching (`set`, `rarity`) printing or appends a new one with the given price; does not change `quantityOwned` |
| `printingSummary(card)` | Ordered list of `{ set, rarity, price, quantity }` plus `unknownQuantity` (`quantityOwned − sum`) |

## `shared/backlog-merge.js`

`mergeCardsIntoBacklog(pulledCards)` — each pulled card: find/create the owned card by name, `quantityOwned += 1`, `addPrinting(...)` with the card's `set`, `rarity`, `price`. Returns `false` if the save failed. Keeps preserving unknown fields.

## `shared/pack-reveal.js`

```
createPackReveal(containerEl, options) -> controller
```

| Option | Description |
|--------|-------------|
| `pack` | `{ cards, revealed }` initial pack state (cards already rarity-sorted by the caller) |
| `pulledStripEl` | Element that receives revealed cards (the pulled strip) |
| `actionSlotEl` | Element on the right of the pack area where the next action button is placed |
| `onReveal(index, card, revealedArray)` | Called after each reveal (caller persists) |
| `onPackComplete()` | Called after the last card has landed in the strip and the pack area is empty |
| `nextAction` | `{ label: "Next pack" \| "See pulled", onClick }` function returning the action once complete |

Controller: `revealCard(index)`, `isComplete()`, `destroy()`.

Behavior guarantees:
- Face-down cards contain no card name, rarity, price or image URL in text, attributes, or accessible names; accessible name is "Face-down card N of M".
- Each card reveals exactly once; rapid clicks on the same card are ignored.
- Click or Enter/Space reveals; focus moves to the next face-down card.
- Reveal = flip, then fly to the next slot in `pulledStripEl`; with `prefers-reduced-motion: reduce` the card moves with no animation.
- After the last reveal the pack area is empty and the action slot shows `nextAction`.

## `progression/progression-box.js`

`generatePack(setName)` → Promise of a rarity-sorted pack (`cards` with `set`, `rarity`, `price`); rejects without side effects on fetch failure.

## `progression/progression-state.js` additions

`emptyBox()`, `startPack(run, pack)`, `revealInPack(run, index)`, `finishPack(run)` (returns the cards to merge and the updated run), `stageState(run, name, boosterList)` → `"opened" | "next" | "locked"`. All pure; persistence via existing `saveRun`.

## Backward-compat rules
- Cards without `printings`, runs without `box`: treated as empty/unknown, never errors.
- Unknown fields on cards and runs MUST be preserved on write (spread existing records).
