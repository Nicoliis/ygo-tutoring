# Data Model: Card Binder View

No stored data changes. Nothing new is saved, and the profile save file is unaffected.

## Constants (`collection/binder-paging.js`)

| Name | Value | Meaning |
|------|-------|---------|
| `BINDER_COLUMNS` | 3 | Columns per page |
| `BINDER_ROWS` | 3 | Rows per page |
| `BINDER_PAGE_SIZE` | 9 | Cards per page (`COLUMNS × ROWS`) |
| `BINDER_WIDE_PAGES` | 2 | Pages shown together on a wide window |
| `BINDER_NARROW_PAGES` | 1 | Pages shown on a narrow window |
| `BINDER_NARROW_MAX_PX` | 700 | Widest window counted as narrow |

## In-memory state (`collection/collection-binder-state.js`)

- `binderOffset`: integer ≥ 0, index in the filtered, sorted card list of the first card shown. Always a multiple of the current view size after clamping.
- `binderPagesPerView`: 2 or 1, from the window width.

## Derived values (pure, from `cards.length`, `offset`, `pagesPerView`)

- `viewSize = BINDER_PAGE_SIZE × pagesPerView`
- `viewCount = max(1, ceil(cards.length / viewSize))`
- `viewIndex = floor(offset / viewSize)` (0-based; label shows `viewIndex + 1`)
- `slotsOfPage(cards, offset, pagesPerView)` → array of pages, each exactly 9 entries, a card or `null` for an empty slot
- `clampOffset(offset, cardsLength, pagesPerView)` → largest valid aligned offset not above `offset`, 0 for an empty list
- `turn(offset, direction, cardsLength, pagesPerView)` → new offset one view away, bounded to the first and last view
- Position label: wide "Pages {first}–{last} of {total}" (last capped at total); narrow "Page {n} of {total}"

## Entities (from the spec)

- **Binder**: the view of the Backlog's filtered, sorted cards; has `binderOffset`.
- **Page / Spread / Card slot**: see derived values; a slot holds a card (`quantityOwned`, `imageSmall`, `name`) or is `null`.
- **Card grid**: unpaged list of tiles for one engine or deck section; one tile per placed copy.

## Validation rules

- A card appears in exactly one slot across all views (no card repeated or skipped).
- A view never starts beyond the last card (except for the empty list, where the empty message replaces the binder).
- Page controls: previous disabled at the first view, next disabled at the last.
