# Tasks: Backlog Card Tags & Type Filter

**Input**: Design documents from `/specs/012-backlog-tags-and-filter/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backlog-filter-contract.md, quickstart.md

**Tests**: The filter rules are pure and go into `shared/contract-tests.js`, run by `shared/profiles.test.js` (Node, or VS Code's bundled runtime with `ELECTRON_RUN_AS_NODE=1`) and `shared/tests.html`. The window, scrollbar and tag size are validated manually via quickstart.md (constitution: no automated UI suite).

**Format**: `- [ ] [ID] [P?] [Story] Description with file path` — [P] = parallelizable (different files, no dependency on incomplete tasks).

**Hard rules for every task**: persistence only via `saveData`/`loadData`/`removeData`; do not change existing methods in `shared/save-utils.js`; preserve unknown fields on every write; every new field is optional on read (cards without `race`, `attribute`, `frameType`, `scale`, `linkval` must never break anything); engines and decks keep their tag size and two-step click.

## Phase 1: Setup

- [ ] T001 Confirm in `collection/collection-card-tag.css` and `collection/collection-backlog-list.css` the selectors the changes will override (`.card-tag`, `.backlog-row`, `.backlog-list`) and note in `specs/012-backlog-tags-and-filter/research.md` the exact stored values of `type` seen in the app for each tab (Effect Monster, Spell Card, Trap Card, Fusion Monster, Synchro Monster, XYZ Monster, Link Monster, Ritual Effect Monster, Pendulum Effect Monster, ...), so `groupOf` matches real data.

---

## Phase 2: Foundational (blocks the stories)

- [ ] T002 Create `shared/backlog-filter.js` with `FILTER_GROUPS` (ids and labels: `monster` "Monster (normal/effect)", `spell`, `trap`, `ritual`, `fusion`, `synchro`, `xyz`, `pendulum`, `link`; value groups per tab: monster/ritual/fusion/synchro → `attribute`, `race`, `level`; xyz → `attribute`, `race`, `rank` (the card's stored `level`); pendulum → `attribute`, `race`, `level`, `scale`; link → `attribute`, `race`, `linkval`; spell/trap → `subtype` (the card's stored `race`)) and `groupOf(card)`: match on the lowercased `type` text with `frameType` as fallback, first match wins in this order: pendulum, link, xyz, synchro, fusion, ritual, spell, trap, else monster when the card is a monster; `null` when nothing is recognizable. Constraint, verbatim: every card belongs to exactly one tab or none; Pendulum takes precedence over the other monster types.
- [ ] T003 In `shared/backlog-filter.js` add `availableValues(cards, groupId)` (only values occurring in cards of that tab, sorted: numbers ascending, strings alphabetical, empty arrays when none), `emptyFilter()`, `isFilterActive(filter)`, `activeTypeCount(filter)` and `matchesFilter(card, filter)`: no ticked type → true; otherwise the card's tab must be ticked and every value group with selections must contain the card's value (missing value → false; values inside a group are OR, groups are AND). Constraint, verbatim: `types` is a subset of the nine ids, `values[group][valueGroup]` empty or missing means no restriction.
- [ ] T004 In `shared/backlog-filter.js` add `loadBacklogFilter()`, `saveBacklogFilter(filter)` and `clearBacklogFilter()` on `profileKey("ygoBacklogFilter")` using `loadData`/`saveData`/`removeData`; load returns `emptyFilter()` for missing or malformed data, unknown values/groups in a stored filter are ignored safely, unknown top-level fields are preserved on save.
- [ ] T005 Extend `shared/contract-tests.js` and the loaded sources of `shared/profiles.test.js` and `shared/tests.html` (add `../shared/backlog-filter.js`) with cases for: `groupOf` for each of the nine tabs including a Pendulum Fusion Monster → pendulum, an unrecognizable type → null, and `frameType` fallback; `availableValues` (only present values, sorted, empty tab); `matchesFilter` (no filter, one tab, several tabs OR, groups AND, values OR, card missing a value, unclassified card); `loadBacklogFilter`/`saveBacklogFilter`/`clearBacklogFilter` per profile with a malformed record and unknown fields preserved.

**Checkpoint**: The filter rules pass their tests before any UI is touched.

---

## Phase 3: User Story 1 - Wider tags, one-click details (Priority: P1) 🎯 MVP

**Goal**: 205 px Backlog tags that open the details window in one click.

**Independent Test**: quickstart.md Scenario 1.

- [ ] T006 [P] [US1] In `collection/collection-card-tag.css` add `.backlog-row .card-tag { width: 205px; }` (engines and decks keep their size). Layout rule inside the tag: the name takes the space it needs first (`flex: 1 1 auto; min-width: 0`) and ends in an ellipsis when too long; the rarity badge is `flex: 0 1 auto` with a small minimum width, shrinking (with its own ellipsis) before the name does, so names up to 18 characters show fully and the badge stays readable.
- [ ] T007 [US1] Add a `directDetails` option: `renderCardTag(card, { draggable, directDetails })` in `collection/collection-render-card-tag.js` passes it to `wireCardTagClick`; in `collection/collection-card-tag-click.js` with `directDetails` a click (and Enter/Space) calls `openCardDetailModal(card)` directly, still calling `maybeBackfillCardDetails(card)`, and never sets the expanded state; without the option the current two-step behavior stays.
- [ ] T008 [US1] In `collection/collection-render-backlog.js` pass `directDetails: true` when building Backlog tags (`buildBacklogRow`); verify engines and decks still use the two-step click and their old width.

---

## Phase 4: User Story 3 - Open the filter and choose card types (Priority: P1)

**Goal**: Filter icon, tabbed window, include checkboxes, Apply.

**Independent Test**: quickstart.md Scenario 3.

- [ ] T009 [US3] In `shared/backlog-panel.js` add a filter icon button (`aria-label="Filter backlog"`, `aria-haspopup="dialog"`, a funnel icon drawn with inline SVG or text) next to the Backlog search box, loading the saved filter on mount (`loadBacklogFilter()` into a global `appliedBacklogFilter`) and exposing it to `renderBacklog`.
- [ ] T010 [US3] Create `shared/backlog-filter-modal.js` with `openBacklogFilterModal({ getCards, onApply })` using `showModal`: title "Filter backlog", a `role="tablist"` with nine tabs (arrow keys move, Enter/Space select), one panel per tab with an "Include <type> cards" checkbox, a draft copy of the saved filter edited by the controls, buttons Apply (saves the draft with `saveBacklogFilter`, calls `onApply`, closes), Clear (`clearBacklogFilter()`, calls `onApply`, closes) and Cancel (discards); Escape/backdrop discard.
- [ ] T011 [P] [US3] Create `shared/backlog-filter.css` (tabs, selected tab, panel, checkbox rows, filter button) and link it plus load `../shared/backlog-filter.js` and `../shared/backlog-filter-modal.js` in `workshop/backlog.html`, `workshop/synergy.html` and `workshop/deckbuilding.html` (after `backlog-panel.js` is fine; they are only called on click).
- [ ] T012 [US3] In `collection/collection-render-backlog.js` list only cards where the name matches AND `matchesFilter(card, appliedBacklogFilter)` (guard with `typeof appliedBacklogFilter !== "undefined"` so a page without the panel lists everything); `onApply` in the panel re-reads the saved filter into `appliedBacklogFilter` and calls the screen's `renderAll()`.

---

## Phase 5: User Story 4 - Values present in each tab (Priority: P2)

**Goal**: Per-tab value chips built from the user's cards, with detail completion.

**Independent Test**: quickstart.md Scenario 4.

- [ ] T013 [US4] In `shared/backlog-filter-modal.js` render each tab's value groups from `availableValues(getCards(), groupId)` as labelled checkbox chips (group headings "Attribute", "Race", "Level", "Rank", "Link rating", "Scale", "Sub-type"), write selections into the draft, and show "You have no <type> cards." (no chips) for a tab with no cards. Selecting a value auto-ticks its tab's include checkbox; unticking the tab keeps the selected values but greys the chips out, and re-ticking restores them.
- [ ] T014 [US4] In `collection/collection-backfill.js` add `completeMissingCardDetails(cards)`: for cards with `apiId` and no `race`, request `API_URL?id=<comma-separated ids>` in chunks of 50 (one request each); for cards with no `apiId`, one request by name; merge returned fields (`extractCardDataFromApiResult`) only where the card lacks them, save the collection once per batch, and mark every card it tried (found or not) with `detailsTried: true` saved on the card so it is requested at most once ever, not once per page visit. Make no request when every card is complete or already tried. Have the older per-card `maybeBackfillCardDetails` also skip cards with `detailsTried`, and let this batch fill the effect text too, so the two routines never fetch the same card.
- [ ] T015 [US4] Call `completeMissingCardDetails` from `openBacklogFilterModal` when the window opens (only for cards the filter needs) and, when it finishes while the window is still open, refresh the value chips and the Backlog list without discarding the user's draft; show a small "Loading card details…" note while it runs.

---

## Phase 6: User Story 5 - See and clear the active filter (Priority: P2)

**Goal**: Visible active state, empty-result message, one-action clear.

**Independent Test**: quickstart.md Scenario 5.

- [ ] T016 [US5] In `shared/backlog-panel.js` show the active state on the filter button when `isFilterActive(appliedBacklogFilter)` (an active class and a small badge with `activeTypeCount`), update it from `refresh()`, and include the count in the button's accessible name.
- [ ] T017 [US5] In `collection/collection-render-backlog.js`, when cards exist but none match the filter, show "No cards match your filter." with a "Clear filter" button that calls `clearBacklogFilter()`, updates `appliedBacklogFilter` and redraws; keep the existing "No cards match your search." for search-only misses.
- [ ] T018 [US5] Verify the filter persists per profile across reload and across Backlog, Synergy Builder and Deckbuilding, and that switching profile shows that profile's own filter (FR-016).

---

## Phase 7: User Story 2 - Nicer scrollbar (Priority: P3)

**Goal**: A slim, themed vertical scrollbar in the Backlog list.

**Independent Test**: quickstart.md Scenario 2.

- [ ] T019 [P] [US2] In `collection/collection-backlog-list.css` style the Backlog list's scrollbar: `scrollbar-width: thin` with `scrollbar-color` using the theme variables, and `::-webkit-scrollbar` rules (8 px wide, rounded thumb in the border color, accent color on hover and while dragging, transparent track); no scrollbar when the list fits.

---

## Phase 8: Polish & Cross-Cutting

- [ ] T020 [P] Keyboard and screen-reader pass for the filter window: focus moves into the dialog and back to the filter button on close, tabs expose `aria-selected` and `aria-controls`, checkboxes have visible labels, the active count is announced.
- [ ] T021 Run every scenario in `specs/012-backlog-tags-and-filter/quickstart.md` in a browser and fix issues (including filtering a backlog of about 2,000 cards under 1 second).
- [ ] T022 Run the contract tests (`shared/tests.html`, or `shared/profiles.test.js` and `shared/save-utils.test.js` via Node/VS Code runtime), run the syntax and missing-reference scan over every page, and grep that no direct `localStorage` use exists outside `shared/save-utils.js`.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories. T002 → T003 → T004 → T005.
- US1 (Phase 3) is independent of the filter and can ship first; T007 before T008.
- US3 (Phase 4) needs Phase 2: T009 → T010 → T012; T011 in parallel with T010.
- US4 (Phase 5) builds on T010: T013 → T015; T014 before T015.
- US5 (Phase 6) needs T009 and T012.
- US2 (Phase 7) is independent and parallel with everything.
- Polish last.

## Parallel Opportunities

- T006, T011 and T019 are CSS-only and independent; T014 can be built while T013 is written; US1 and US2 can run alongside the filter work.

## Implementation Strategy

1. **MVP**: Phases 1–3 (tag width and one-click details). Validate quickstart Scenario 1.
2. Add the filter core (Phases 2 and 4), then values (Phase 5) and the active-state polish (Phase 6).
3. Finish with the scrollbar (Phase 7) and Polish.
