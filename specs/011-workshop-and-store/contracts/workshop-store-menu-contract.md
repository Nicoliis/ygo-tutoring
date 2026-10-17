# Contract: Shared Modules for Workshop, Store & Menu

Internal client-side contracts. No network endpoints are added.

## `shared/areas.js`

| Item | Behavior |
|------|----------|
| `AREAS` | Array of `{ id, label, theme, pages: [{ label, href }] }`; ids `run`, `workshop`, `store`, `tools` |
| `currentArea()` | The area whose folder/page matches the current URL, or `null` on the main menu |
| `hrefFromRoot(path)` | Builds a relative link that works from root and from one-level folders |

Pages set `document.body.dataset.area = currentArea().id`; `areas.css` themes via `[data-area="..."]` variables.

## Navigation (`shared/nav-*.js`)

Sidebar shows: profile block, "Back to menu" link, then only the current area's pages (current one highlighted with `aria-current="page"`).

## `shared/backlog-panel.js`

```
mountBacklogPanel(containerEl, { allowAdd, allowRemove, allowQtyEdit, onChange }) -> { refresh() }
```

| Behavior | Rule |
|----------|------|
| Listing | Every owned card with quantity and rarity badge (rarest printing); empty states for none/no match |
| Search | Filters by name; clearing restores the full list |
| Details | Clicking a card opens the card-details window (with printings) |
| Drag | Cards are draggable with the existing payload understood by engine/deck drop zones |
| Add from database | Shown only when `allowAdd` (Sandbox profiles) |
| Updates | `refresh()` re-renders from stored data; screens call it after any change; `onChange` fires after panel-originated changes |

Identical markup/behavior on every screen (FR-001, SC-001).

## `shared/money.js` (pure)

| Function | Behavior |
|----------|----------|
| `toCents(value)` | Parses a price string/number to integer cents or `null` when missing/invalid/≤ 0 |
| `formatMoney(cents)` | `"12.34"` style with two decimals |
| `priceForPurchase(k)` | `round_half_up(100 × 1.5^k)` cents |
| `totalForPurchases(k, n)` | Sum of the next `n` unit prices starting at purchase index `k` |

## `store/store-state.js`

| Function | Behavior |
|----------|----------|
| `getBalanceCents(run)` | `run.balanceCents || 0` |
| `reachedBoosters(run, list)` | Completed stages plus current, in list order |
| `nextPriceCents(run, setName)` | `priceForPurchase(run.boosterBuys[setName] || 0)` |
| `canBuy(run, setName, n, list)` | `{ ok, reason, totalCents, missingCents }`; reasons: not reached, invalid amount, not enough balance |
| `buyBoosters(run, setName, n)` | Returns the updated run (balance, buys, inventory) |
| `canSell(card, printingIndex)` | `{ ok, reason, valueCents }`; not ok for no `setPrice`, quantity < 1 |
| `sellPrinting(run, collection, cardId, printingIndex)` | Returns `{ run, collection }` with quantities, balance and allocations updated |

All persistence goes through `saveRun` / the collection save path (`saveData`); a transaction is applied only if both the run and the collection saves succeed in order (collection first for sells, run first for buys), with a clear message otherwise.

## Pack inventory opening (`progression/`)

`openBoughtPack(setName)` generates one pack through `generatePack`, stores `extraPack`, and uses `createPackReveal`; on completion cards merge via `mergeCardsIntoBacklog` and `extraPack` clears.

## Backward-compat rules
- Runs without the new fields read as balance 0, empty inventory, `extraPack` null.
- Printings without `setPrice` and "unknown" copies are never sellable.
- Unknown fields on runs, cards, engines and decks MUST be preserved on write (spread existing records).
