# Research: Card Binder View

## 1. How to model the binder position
- **Decision**: Keep an **offset** (index of the first card shown) into the filtered, sorted list. A view shows `pagesPerView × 9` cards starting at the offset; one turn moves the offset by that amount; the offset is always aligned down to the current view size.
- **Rationale**: Switching between 2-page and 1-page views (window resize) then keeps the user at the same card instead of jumping; clamp is a one-line rule (last aligned offset).
- **Alternatives**: Page index (jumps when the page size changes); remembering a card id (breaks when the card is filtered out or removed).

## 2. Wide vs narrow
- **Decision**: One breakpoint constant (`BINDER_NARROW_MAX_PX`, 700). `matchMedia` decides `pagesPerView` (2 wide, 1 narrow); a change listener re-renders the binder. The turn step equals the view size, the position label counts spreads when wide and pages when narrow (clarified: one page at a time on narrow).
- **Rationale**: Matches the clarified behaviour without duplicating logic; the existing responsive CSS already uses width media queries.
- **Alternatives**: Resize observers (heavier, no gain); CSS-only hiding of the second page (would still request its images, violating FR-015).

## 3. Which pictures load
- **Decision**: Render only the cards of the current view into the DOM, with the existing `imageSmall`. Turning a page replaces the slots; the browser cache serves images already seen. Engine and deck grids render every card with `loading="lazy"`.
- **Rationale**: Satisfies FR-015 with no extra code or API; no prefetching (Constitution II).
- **Alternatives**: Prefetch neighbouring pages (extra requests, violates principle II); virtual scrolling (unneeded for ≤ 18 slots).

## 4. Card slot content and actions
- **Decision**: A slot is a button-like card picture (details on one click, same as `directDetails` tags), draggable with the existing `text/plain` card id payload, with the owned quantity as a badge, and (per `panelAllows`) the quantity stepper and a remove control. A card with no `imageSmall` or a failed image shows a stand-in carrying its name; the accessible name is always the card name.
- **Rationale**: Parity with the removed row (FR-007) while keeping the hover/expanded text-tag steps out of the picture view, where the image is already visible.
- **Alternatives**: Keep the text tag under each picture (duplicates the name, wastes the 3×3 space).

## 5. Engines and decks
- **Decision**: Replace each text tile with a picture tile (still one per copy) with the existing remove control and the existing move payload for deck cards; the list containers become wrapping grids with no height cap. A click opens the details directly (the expand-image step is redundant when the picture is shown).
- **Rationale**: Clarified as plain grid, no paging; reusing `renderCardTile`'s contract keeps `removeCardFromEngine` / `removeCardFromDeckSection` and drag-and-drop untouched.
- **Alternatives**: Binder pages in engines and decks (rejected in clarification).

## 6. Resetting and clamping
- **Decision**: Reset the offset to 0 on search input, on filter apply and on sort change (three call sites); on every other render (collection changes) clamp it to the last valid aligned offset.
- **Rationale**: Exactly FR-004 with minimal wiring; `renderAll()` stays the single refresh path.
- **Alternatives**: Reset on every render (loses position after a quantity edit).

## 7. Testing
- **Decision**: Pure paging functions go through `shared/contract-tests.js`; `binder-paging.js` is added to the Node harness list and to `shared/tests.html`.
- **Rationale**: Same pattern as filter/store logic; the DOM part is verified by `quickstart.md`.
