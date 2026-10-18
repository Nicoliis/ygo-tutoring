# Tasks: Card Binder View

**Input**: Design documents from `/specs/014-card-binder-view/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/binder-ui-contract.md, quickstart.md

**Tests**: Only the pure paging rules get automated checks (added to the existing contract tests, as the plan states). The UI is verified with `quickstart.md`.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in `collection/views/` and behaviour stays outside it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] Backlog binder, [US2] card actions kept, [US3] engine/deck picture grid

---

## Phase 1: Setup

- [X] T001 Create the folder `collection/views/` and an empty stylesheet `collection/views/binder.css` with a header comment ("Binder, card slot and card grid layout")

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 Create `collection/binder-paging.js` with the constants at the top (`BINDER_COLUMNS = 3`, `BINDER_ROWS = 3`, `BINDER_PAGE_SIZE = BINDER_COLUMNS * BINDER_ROWS`, `BINDER_WIDE_PAGES = 2`, `BINDER_NARROW_PAGES = 1`, `BINDER_NARROW_MAX_PX = 700`) and the pure functions from `contracts/binder-ui-contract.md`: `viewCount(length, pagesPerView)` (integer ≥ 1), `clampOffset(offset, length, pagesPerView)` (largest valid offset, a multiple of the view size, 0 for an empty list), `turn(offset, direction, length, pagesPerView)` (one view away, bounded to the first and last view), `slotsOfPage(cards, offset, pagesPerView)` (`pagesPerView` pages of exactly 9 entries, a card or `null`) and `positionLabel(offset, length, pagesPerView)` (wide: "Pages {first}–{last} of {total}" with last capped at total; narrow: "Page {n} of {total}")
- [X] T003 Add contract tests for the paging rules to `shared/contract-tests.js`: every card appears exactly once when stepping from offset 0 by the view size (wide and narrow, with 0, 1, 9, 10, 18, 19 and 40 cards); `null` slots only at the end of the last view; `clampOffset` after the list shrinks; `turn` stops at both ends; position labels for both modes; offset kept near the same card when switching from 2 pages to 1 and back
- [X] T004 Register `collection/binder-paging.js` in the Node harness list in `shared/profiles.test.js` and in `shared/tests.html`, then run `node shared/profiles.test.js` and confirm it ends with "profiles contract: OK"
- [X] T005 [P] Add the shared tags to `workshop/backlog.html`, `workshop/synergy.html` and `workshop/deckbuilding.html`: `<link>` for `collection/views/binder.css` (with the other collection styles) and `<script>` tags for `collection/binder-paging.js`, `collection/views/card-slot-view.js`, `collection/views/binder-view.js`, `collection/views/card-grid-view.js` and `collection/collection-binder-state.js`, in that order before `collection-render-backlog.js`

**Checkpoint**: paging rules pass their tests; pages load without script errors (the new view files may still be empty).

---

## Phase 3: User Story 1 - Browse the Backlog like a binder (Priority: P1) 🎯 MVP

**Goal**: The Backlog shows card pictures as two facing 3×3 pages (one page on narrow windows) with page turning, and search, filter and sort decide which cards fill it.

**Independent Test**: `quickstart.md` sections 2 and 5: with more than 40 cards, two 3×3 pages are shown, Next/Previous reach every card once, search/filter/sort reset to the first view, the narrow window shows one page.

- [X] T006 [P] [US1] Create `collection/views/card-slot-view.js` with `buildCardSlot(card, options)` (picture from `card.imageSmall` with `loading="lazy"`, the card name as accessible name, a visible `×{quantityOwned}` badge) and `buildEmptySlot()` (inert, `aria-hidden="true"`); no behaviour beyond building elements; slot size fixed so the 3×3 grid never shifts; any pixel or ratio values in named constants or CSS variables at the top
- [X] T007 [P] [US1] Create `collection/views/binder-view.js` with `renderBinderView(containerEl, model, handlers)`: a controls bar with `Previous` and `Next` buttons (real `<button>`s with `aria-label`, `disabled` at the first and last view) and the position label in an `aria-live="polite"` element, then one or two `.binder-page` elements, each a 3×3 grid of slots from `slotsOfPage`; model = `{ cards, offset, pagesPerView }`, handlers = `{ onPrevious, onNext, buildSlot }`
- [X] T008 [US1] Style the binder in `collection/views/binder.css`: two pages side by side with a spine gap, each a 3-column grid of fixed-ratio slots, the controls bar, the empty slot look, the quantity badge, and a narrow-window rule (max-width `700px`, the same value as `BINDER_NARROW_MAX_PX`) that avoids horizontal scrolling
- [X] T009 [US1] Create `collection/collection-binder-state.js`: top-of-file `let binderOffset = 0` and `let binderPagesPerView`; initialise `binderPagesPerView` from `window.matchMedia("(max-width: " + BINDER_NARROW_MAX_PX + "px)")` and add a `change` listener that updates it, re-clamps the offset and calls `renderBacklog()`; export `resetBinder()` (offset 0) and `renderBinder(cards)` (clamp the offset with `clampOffset`, then call `renderBinderView(backlogListEl, …)` with Previous/Next handlers that use `turn` and re-render)
- [X] T010 [US1] Change `collection/collection-render-backlog.js`: keep the search/filter/sort pipeline and all empty and no-match messages, but replace the loop that appended `buildBacklogRow` rows with `renderBinder(sortBacklogCards(filtered, sortId))`; remove the now-unused `buildBacklogRow`
- [X] T011 [US1] Reset the binder when the result set changes: call `resetBinder()` in the search input handler in `collection/collection-search-wiring.js`, in the sort `change` handler and in the filter `onApply` callback in `shared/backlog-panel.js` (each before its `renderAll()` call, guarded with `typeof resetBinder === "function"` as the panel is shared by pages)
- [X] T012 [US1] Clean the list container in `collection/collection-backlog-list.css`: remove the `.backlog-row` text-row rules that are no longer used and keep the `#backlogList` scrolling and scrollbar rules; adjust `collection/collection-responsive.css` if its `.backlog-list` rule conflicts with the binder layout

**Checkpoint**: User Story 1 works on its own: pictures in a paged 3×3/3×3 binder, one page when narrow, resets and clamping as specified.

---

## Phase 4: User Story 2 - Use cards in the binder as before (Priority: P1)

**Goal**: Every action a Backlog row offered is available on its card slot with unchanged results and limits.

**Independent Test**: `quickstart.md` section 3, in a Sandbox and a Progression Run profile.

- [X] T013 [US2] In `collection/views/card-slot-view.js` make the picture a button that opens the card details as `directDetails` did (click, Enter and Space; call `clearFloatingOverlays()` and `maybeBackfillCardDetails(card)` before `openCardDetailModal(card)`), keeping behaviour calls passed in through the `options` handlers rather than imported into the view
- [X] T014 [US2] Make the slot draggable in `collection/views/card-slot-view.js` with the unchanged payload: `dragstart` sets `text/plain` to `card.id` and `effectAllowed = "copy"`
- [X] T015 [US2] Add the quantity stepper and remove control to the slot: reuse `buildBacklogQtyStepper(card)` (`collection/collection-backlog-qty-stepper.js`) and the existing remove action `removeCard(card.id)`, shown only when `panelAllows("allowQtyEdit")` / `panelAllows("allowRemove")`; when quantity editing is not allowed show the read-only `×N` badge with its existing `aria-label` ("Owned quantity for …"); wire these through `buildSlot` in `collection/collection-binder-state.js`
- [X] T016 [US2] Add the no-image stand-in in `collection/views/card-slot-view.js`: when `card.imageSmall` is missing or the image fires `error`, replace it with an element carrying the card name (same slot size, still clickable and draggable); add its style to `collection/views/binder.css`
- [X] T017 [US2] Add the slot styles for the stepper, remove control and focus ring (keyboard focus visible, controls reachable by Tab) to `collection/views/binder.css`, keeping the controls inside the slot so the 3×3 grid does not change size

**Checkpoint**: Every former row action works from the binder in both profile types; US1 still passes.

---

## Phase 5: User Story 3 - See the cards of engines and decks (Priority: P2)

**Goal**: Engines and deck sections show every card as a picture in a plain wrapping grid, no paging, with remove, move and add unchanged.

**Independent Test**: `quickstart.md` section 4.

- [X] T018 [P] [US3] Create `collection/views/card-grid-view.js` with `renderCardPicture(card, { onRemove, removeLabel, dragMovePayload })`: a picture (`loading="lazy"`, name stand-in when there is no image, same as the slot), a remove control with `aria-label` = `removeLabel` and `stopPropagation`, `dragstart` setting `application/x-deck-card-move` when `dragMovePayload` is given, and click/Enter opening the card details (same calls as T013)
- [X] T019 [US3] Switch `renderCardTile` in `collection/collection-render-card-tile.js` to build its tile with `renderCardPicture` (keep its signature, so `collection/collection-engine-card-contents.js` and `collection/collection-render-deck-section-cards.js` keep working), keeping the `(removed card)` fallbacks untouched
- [X] T020 [P] [US3] Style the grid in `collection/views/binder.css`: `.engine-card-contents` and the deck section lists become wrapping grids of picture tiles; remove the `max-height: 160px` cap on `.deck-main-list, .deck-extra-list` in `collection/collection-deck-sections.css` and any fixed height on `.engine-card-contents` in `collection/collection-bag-body.css` so every card is visible by scrolling the page; keep the drop-zone highlight and the empty-state message ("No cards yet.") visible
- [X] T021 [US3] Remove the picture-expansion step that no longer applies to engines and decks: since a click opens the details directly, drop the `expandedCardId` branch use for these tiles (leave `collection/collection-card-tag-click.js` working for other callers) and confirm `collection/collection-render-all.js` still redraws all three areas after any change

**Checkpoint**: All three user stories work; engines and decks show pictures and keep add/remove/move behaviour.

---

## Phase 6: Polish & Cross-Cutting

- [X] T022 Check every number added by this feature is a named constant at the top of its file (no bare 3, 9, 18, 700 or pixel sizes in the JS) and that `collection/views/` contains only DOM and CSS (no storage, no calls to `saveCollection`)
- [X] T023 [P] Verify keyboard-only use: Tab reaches Previous/Next, each slot's picture, stepper and remove; Enter/Space open details; the position label announces changes
- [ ] T024 Run `node shared/profiles.test.js` (must end with "profiles contract: OK"), open `shared/tests.html`, and walk through every section of `quickstart.md` (Backlog binder, card actions in Sandbox and Progression Run, engines and decks, narrow window, network panel check that a page turn requests only the new images)
- [X] T025 [P] Update `collection/index.html` and the Workshop pages' visible hints if any text still mentions "list" or "rows" for the Backlog

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories**. T002 precedes T003/T004; T005 is independent of them and only needs the file names fixed by the plan.
- **US1** needs Phase 2. Inside US1: T006 and T007 in parallel, T008 with them, then T009 → T010 → T011, T012 last.
- **US2** builds on the slot from US1 (T006, T009); T013–T016 touch the same file in sequence, T015 also edits `collection-binder-state.js`.
- **US3** is independent of US1/US2 except for the shared stylesheet and the picture/stand-in idea: T018 and T020 in parallel, then T019, T021.
- **Polish** after the stories being shipped.

### Parallel opportunities

- T005 with T002–T004.
- T006, T007 (different files) in US1; T018 and T020 in US3.
- US3 can be built in parallel with US2 by a second person.
- T023 and T025 in Polish.

## Implementation Strategy

- **MVP**: Phase 1, Phase 2 and User Story 1 (T001–T012): the binder with paging, resets and the narrow view. Shippable on its own if cards can still be opened (add T013 for details).
- **Then**: US2 (action parity, required before the old rows are considered replaced), then US3 (engines and decks).
- Validate after each phase with the matching `quickstart.md` section; no phase may leave a page throwing script errors.
