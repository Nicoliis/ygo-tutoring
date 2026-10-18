# Implementation Plan: Card Binder View

**Branch**: `014-card-binder-view` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-card-binder-view/spec.md`

## Summary

Replace the Backlog's text rows with a **binder**: a paged display of card pictures, two facing pages of 3×3 (18 cards) on wide windows and one page (9 cards) on narrow ones. Engines and deck sections stop showing text tiles and show **every card as a picture in a plain wrapping grid** (no paging).

- **Paging rules are pure** (`collection/binder-paging.js`): page size, how many pages show at once, page counts, which cards a view holds, clamping, and the step of one turn. They are unit-tested with the existing contract tests.
- **Rendering is separated from behaviour** (the user's standing structure request): all DOM building lives in a new `collection/views/` folder (binder view, card slot view, card grid view, binder CSS); behaviour (state, wiring to search/filter/sort resets, actions) stays in the existing `collection-*.js` files.
- The binder keeps its position as an **offset into the filtered, sorted list**, so a window-size change (2 pages ↔ 1 page) keeps the user near the same card. Search, filter or sort changes reset it; collection changes clamp it.
- Every Backlog row action is kept on the card slot: open details (one click), drag out (same payload), quantity edit and removal (same profile rules via `panelAllows`).
- Pictures reuse `card.imageSmall` (already stored per card). Only the current view's slots exist in the DOM, so no pictures of other pages are requested; engine and deck grids use native lazy loading.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses `renderCardTile`, `openCardDetailModal`, `setCardQuantity`, `removeCard`, `maybeBackfillCardDetails`, the existing drag payloads and `imageSmall`

**Storage**: None new. The binder position is in memory only (spec: not remembered between visits)

**Testing**: Pure paging logic added to `shared/contract-tests.js` (run by `shared/profiles.test.js` and `shared/tests.html`); UI checked with `quickstart.md`

**Target Platform**: Modern desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: First binder view of a 500-card Backlog under 1 s; a page turn under 0.5 s (draws at most 18 slots)

**Constraints**: No new API calls (Constitution II); no horizontal scroll at phone width; keyboard operable; drag-and-drop payloads unchanged; image requests only for the current view

**Scale/Scope**: Backlogs of a few thousand cards (hundreds of pages at most); engines and deck sections of up to a few dozen cards

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Cards are visible at a glance; page controls are real buttons with accessible names and a position label (`aria-live`); empty/no-match states keep their messages; slots keep keyboard access to details and per-card actions; no destructive change (removal keeps today's behavior). |
| II. Minimal API Footprint | Pass. No requests added. Only the current view's images are in the DOM (Backlog), the rest use native lazy loading; already-loaded images are served from the browser cache. No prefetching of adjacent pages. |
| III. Maintainability & Simplicity | Pass. One small pure module plus a `views/` folder of single-purpose view files; replaces the Backlog row builder rather than adding a parallel view (the toggle was rejected in clarification). No framework or dependency. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/014-card-binder-view/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── binder-ui-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
collection/
├── binder-paging.js                  # NEW: pure paging rules (constants, counts, slicing, clamp, step)
├── collection-binder-state.js        # NEW: behaviour: binder offset, narrow-window watcher, reset/clamp, page-turn handlers
├── collection-render-backlog.js      # filter+sort as today, then hands the cards to the binder view (row builder removed)
├── collection-search-wiring.js       # search input also resets the binder
├── collection-render-card-tile.js    # engine/deck tiles now built by the card grid view (picture + remove)
├── collection-render-deck-section-cards.js   # uses the grid view container
├── collection-engine-card-contents.js        # uses the grid view container
├── collection-backlog-list.css       # text-row styles removed; list container keeps scrolling rules
├── collection-deck-sections.css      # deck lists no longer capped to 160px (all cards visible)
└── views/                            # NEW folder: rendering and visual composition only
    ├── binder-view.js                # builds the two/one page spread, controls and position label, empty states
    ├── card-slot-view.js             # one slot: picture or name stand-in, quantity, stepper, remove, empty slot
    ├── card-grid-view.js             # picture tile (+ remove) used by engines and deck sections
    └── binder.css                    # page/spread/slot/grid layout, narrow-window rules
shared/
├── backlog-panel.js                  # reset binder on sort change and on filter apply
└── contract-tests.js                 # new paging checks
workshop/
└── backlog.html, synergy.html, deckbuilding.html   # script/link tags for the new files
collection/index.html                 # same tags (it also mounts the Backlog)
```

**Structure Decision**: Single static project. New pure logic is isolated in `binder-paging.js` so it can be tested in Node like the filter and store rules; all DOM building moves under `collection/views/` so the rendering folder can be collapsed, as requested earlier. Existing behaviour files keep their names and roles.

## Complexity Tracking

No constitution violations.
