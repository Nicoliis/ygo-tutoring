# Contract: Backlog Filter Modules

Internal client-side contracts. No network endpoints are added (the one existing card-data endpoint is used in batches).

## `shared/backlog-filter.js`

| Function | Behavior |
|----------|----------|
| `FILTER_GROUPS` | Ordered list of `{ id, label, valueGroups }` for the nine tabs |
| `groupOf(card)` | The tab id the card belongs to (precedence in data-model.md) or `null` when unclassified |
| `availableValues(cards, groupId)` | `{ [valueGroup]: sortedUniqueValues }` collected only from cards of that tab; empty arrays when none |
| `emptyFilter()` | `{ types: [], values: {} }` |
| `isFilterActive(filter)` | True when any type is ticked |
| `activeTypeCount(filter)` | Number of ticked tabs |
| `matchesFilter(card, filter)` | No ticked type → true. Otherwise the card's tab must be ticked and every value group with selections must contain the card's value; missing value → false |
| `loadBacklogFilter()` / `saveBacklogFilter(filter)` / `clearBacklogFilter()` | Persist per profile with `loadData`/`saveData`/`removeData` on `profileKey("ygoBacklogFilter")`; load returns `emptyFilter()` for missing/malformed data and preserves unknown fields on save |

All functions tolerate cards with missing fields.

## `shared/backlog-filter-modal.js`

```
openBacklogFilterModal({ getCards, onApply })
```

| Behavior | Rule |
|----------|------|
| Window | Title "Filter backlog"; `role="tablist"` with nine tabs (arrow keys move, Enter/Space selects); one panel per tab with an "Include <type> cards" checkbox and the value groups as checkbox chips |
| Draft | Starts from the saved filter; edits change only the draft |
| Apply | Saves the draft (`saveBacklogFilter`), calls `onApply`, closes |
| Cancel / Escape / backdrop | Discards the draft |
| Clear | `clearBacklogFilter()`, calls `onApply`, closes |
| Empty tab | Says there are no cards of that type; no value chips |
| Background completion | On open, cards missing `race` are completed through `completeMissingCardDetails`; the panel's values refresh when it finishes |

## `shared/backlog-panel.js` additions

- A filter icon button (`aria-label="Filter backlog"`, `aria-haspopup="dialog"`) next to the search box; when a filter is active it shows an active class and the number of ticked types.
- `refresh()` also refreshes the button state.

## `collection/collection-backfill.js` addition

`completeMissingCardDetails(cards) -> Promise` requests `API_URL?id=<ids>` in chunks of 50 for cards with `apiId` and no `race`, one request by name for cards with no id, merges the fields into the cards (only where missing), saves the collection and re-renders. Each card is attempted once per page visit.

## `collection/collection-render-backlog.js`

Lists `collection.cards` where the name matches the search AND `matchesFilter(card, appliedFilter)`. When nothing matches because of the filter, shows "No cards match your filter." with a "Clear filter" button.

## Tags

`renderCardTag(card, { draggable, directDetails })`: with `directDetails`, click and Enter/Space open `openCardDetailModal(card)` directly (no expanded-image state). Only the Backlog rows pass it.

## Backward-compat rules
- Cards without detail fields classify by `type` and never break the filter.
- A stored filter with unknown values or groups is ignored safely.
- Unknown fields in the stored filter are preserved on write.
