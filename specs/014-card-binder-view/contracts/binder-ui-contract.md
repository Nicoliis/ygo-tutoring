# UI Contract: Card Binder View

## Pure paging module (`collection/binder-paging.js`)

```text
slotsOfPage(cards, offset, pagesPerView)  -> [ [card|null ×9], ... ]   // pagesPerView arrays
viewCount(length, pagesPerView)           -> integer >= 1
clampOffset(offset, length, pagesPerView) -> integer, multiple of view size
turn(offset, direction, length, pagesPerView)  -> integer   // direction -1 | +1
positionLabel(offset, length, pagesPerView)    -> string
```

Guarantees: every card in `cards` appears exactly once when stepping the offset from 0 by the view size; empty slots are `null` and only at the end of the last view; results never depend on the DOM.

## Backlog binder (`collection/views/binder-view.js`)

- Container `#backlogList` keeps its id (the collection modules reference it).
- Structure: a position/controls bar (`Previous`, label with `aria-live="polite"`, `Next`) and a spread with one or two `.binder-page` elements, each a 3×3 grid of `.binder-slot`.
- Previous/Next are `<button>`s with `aria-label`s, `disabled` at the ends, operable by keyboard.
- Empty list and no-match states keep today's messages and render no binder.

## Card slot (`collection/views/card-slot-view.js`)

- A picture button with the card name as its accessible name; Enter/Space and click open the card details (as `directDetails` did).
- `draggable`, `dragstart` sets `text/plain` = card id and `effectAllowed = "copy"` (unchanged payload).
- Owned quantity badge `×N` always visible; quantity stepper and remove control only when `panelAllows("allowQtyEdit")` / `panelAllows("allowRemove")`, with the same behaviour as before.
- No image or load error: stand-in with the card name, same slot size.
- Empty slot: inert, `aria-hidden="true"`.

## Card grid (`collection/views/card-grid-view.js`)

- `renderCardPicture(card, { onRemove, removeLabel, dragMovePayload })` replaces the text tile in engines and deck sections; same options as `renderCardTile` today.
- Picture with `loading="lazy"`, a remove control with `aria-label` = `removeLabel`; deck cards keep `application/x-deck-card-move` on `dragstart`.
- Click or Enter opens the card details.
- Containers wrap their tiles and are not height-capped.

## Behaviour hooks (`collection/collection-binder-state.js`)

- `resetBinder()`: sets the offset to 0; called by the search input handler, the filter `onApply` and the sort `change` handler.
- `renderBinder(cards)`: clamps the offset, then asks the view to draw; called from `renderBacklog()` after filter and sort.
- A `matchMedia` listener on `(max-width: 700px)` updates `binderPagesPerView` and re-renders.
