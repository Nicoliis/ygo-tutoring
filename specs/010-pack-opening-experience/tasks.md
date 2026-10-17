# Tasks: Pack Opening Experience & Pull History

**Input**: Design documents from `/specs/010-pack-opening-experience/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pack-reveal-contract.md, quickstart.md

**Tests**: Pure-logic cases (printings, pack state, stage state, rarity ordering) are added to `shared/contract-tests.js`, run by `shared/profiles.test.js` (Node, or VS Code's bundled runtime with `ELECTRON_RUN_AS_NODE=1`) and `shared/tests.html`. Animation and layout are validated manually via quickstart.md (constitution: no automated UI suite).

**Format**: `- [ ] [ID] [P?] [Story] Description with file path` — [P] = parallelizable (different files, no dependency on incomplete tasks).

**Hard rules for every task**: persistence only via `saveData`/`loadData`/`removeData` (no direct `localStorage`); do not modify existing methods in `shared/save-utils.js`; preserve unknown fields on every write (spread existing records); everything new must be optional on read (old cards have no `printings`, old runs have no `box`).

## Phase 1: Setup

- [X] T001 Verify against the live `cardsets.php` response whether each set entry includes a set image field; record the exact field name (or its absence) in `specs/010-pack-opening-experience/research.md` under Decision 7. Placeholder rendering is the fallback either way.

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 Create `shared/rarity.js` by moving `draft/rarity-glow-tiers.js` and `draft/draft-rarity-glow.js` (tier table, `getRarityGlow`) and adding `rarityRank(rarity)` (higher = rarer; rank 0 = common/default; unknown or `null` = 0), `rarityLabel(rarity)` (provider rarity string, or "Unknown rarity"), `applyRarityGlow(el, rarity)` `sortPackByRarity(cards)` (returns a new array ordered common first and rarest last by `rarityRank`, ties by `price` ascending; used by BOTH the Progression Run and the Draft) and `buildRarityBadge(rarity)` (element with class `rarity-badge` and the explicit rarity name as text). Move glow styles from `draft/draft-pick-card-glow.css` into new `shared/rarity.css` plus a `.rarity-badge` style that is readable without color. Delete the moved draft files, update `draft/index.html` script/link tags, and make `draft/draft-render-pick-group.js` use `applyRarityGlow`.
- [X] T003 [P] Create `shared/printings.js` (pure): `addPrinting(card, { set, rarity, price })` increments `quantity` of the printing whose (`set`, `rarity`) matches or appends a new one with the given `price`; `printingSummary(card)` returns the ordered `{ set, rarity, price, quantity }` list plus `unknownQuantity` (`quantityOwned − sum`, never negative); `trimPrintings(card)` removes quantity from the oldest printings until `quantityOwned ≥ sum(printings[].quantity)` holds. Constraints, verbatim: `set` non-empty string; `rarity` string or `null` (unknown); `price` number ≥ 0 recorded at the FIRST pull of that printing and never updated; `quantity` integer ≥ 1; identity is the (`set`, `rarity`) pair within a card; missing `printings` on old cards is valid.
- [X] T004 [P] In `shared/pack-pool.js` add `set: setName` to every pool entry built in `fetchSetCardPool` so every pulled card carries its set (rarity and price are already present).
- [X] T005 Change `shared/backlog-merge.js` `mergeCardsIntoBacklog(pulledCards)` so each pulled card (with `set`, `rarity`, `price`) still increments `quantityOwned` by 1 and also calls `addPrinting` on the owned card (new cards are created with their first printing); unknown fields on the blob and cards stay preserved; still returns `false` when the save fails. Update `draft/draft-backlog-merge.js` only if its call needs changing.
- [X] T006 Extend `shared/contract-tests.js` with cases for: `addPrinting` (same set+rarity increments, same card from two sets/rarities gives two printings, price stays at first pull), `printingSummary` (unknown quantity for old cards, none for fresh ones), `trimPrintings` invariant, `rarityRank` ordering (common < rare < super < ultra-type < secret; unknown = 0), and `mergeCardsIntoBacklog` writing printings while preserving unknown fields. Add `../shared/rarity.js`, `../shared/printings.js` and `../shared/backlog-merge.js` (plus `nextId` from `dom-utils.js` and a `profileKey` active profile) to the loaded sources in `shared/profiles.test.js` and `shared/tests.html`.

**Checkpoint**: Draft still works (glow unchanged) and kept cards now record set/rarity/price.

---

## Phase 3: User Story 2 - Remember where and how each card was pulled (Priority: P1)

**Goal**: Every owned card shows which sets/rarities/prices its copies came from; old cards degrade gracefully.

**Independent Test**: quickstart.md Scenario 3.

- [X] T007 [US2] In `shared/card-detail-modal.js` (used by Collection and Draft) add a "Printings" section built from `printingSummary(card)`: one line per printing (set, rarity name via `buildRarityBadge`, price, quantity) and an "Unknown rarity/set × N" line when `unknownQuantity > 0`; omit the section when there is nothing to show. Every page that loads `shared/card-detail-modal.js` (currently `collection/index.html`, `draft/index.html` AND `tracker/index.html`; grep `card-detail-modal.js` across all `index.html` files to confirm) MUST also load `../shared/rarity.css`, `../shared/rarity.js` and `../shared/printings.js` before it is used, so opening a card never throws; additionally guard the section with `typeof printingSummary === "function"`. Verify that cards without `printings` open in the detail modal and render in the Collection without errors (SC-008), and that the T006 contract cases pass.
- [X] T008 [P] [US2] Maintain the printing invariant when copies are removed or quantities lowered: call `trimPrintings(card)` in `collection/collection-set-quantity.js` and `collection/collection-remove-card.js` (and any other place that lowers `quantityOwned`; grep `quantityOwned` to find them). Increases from search/import (`collection/collection-add-card.js`, YDK import) intentionally add no printing.

**Checkpoint** (T009 was merged into T006/T007 after analysis, so the ID is unused): US2 testable on its own via the Draft's "Add to Backlog" and the Collection detail modal.

---

## Phase 4: User Story 1 - Open a booster pack card by card (Priority: P1) 🎯 MVP

**Goal**: Progression Run boxes open one pack at a time with a face-down, click-to-reveal, flip-and-fly experience; the Booster Draft uses the same flow per booster.

**Independent Test**: quickstart.md Scenarios 1, 2, 6, 7.

- [X] T010 [P] [US1] Create `shared/pack-reveal.css`: card back (two-face flip using `rotateY(180deg)` with `backface-visibility: hidden`), pack area, pulled strip, action slot on the right of the pack area, and a `@media (prefers-reduced-motion: reduce)` block that removes transitions/animations.
- [X] T011 [US1] Create `shared/pack-reveal.js` implementing `createPackReveal(containerEl, options)` exactly per contracts/pack-reveal-contract.md: face-down buttons whose DOM text, attributes and accessible names contain no name, rarity, price or image URL (accessible name "Face-down card N of M"); each card reveals once (ignore repeat clicks); click or Enter/Space reveals and moves focus to the next face-down card; reveal = flip, then fly to the next free slot of `pulledStripEl` (measure rects, Web Animations API, then reparent); skip animation when `prefers-reduced-motion: reduce`; after the last card lands the pack area is empty and `nextAction` is rendered in `actionSlotEl`; calls `onReveal(index, card, revealedArray)` per reveal and `onPackComplete()` at the end; honors an initial `pack.revealed` so a resumed pack shows already revealed cards in the strip and the rest face down.
- [X] T012 [P] [US1] In `progression/progression-box.js` replace `openBox` with `generatePack(setName)`: one pack of `getBoosterSize(setName)` cards via `fetchSetCardPool` and `weightedRandomPick`, each card carrying `set`, `rarity`, `price`; order them with `sortPackByRarity` (common first, rarest last); reject without side effects on fetch failure or empty pool. Keep `BOX_PACKS = 24`.
- [X] T013 [P] [US1] In `progression/progression-state.js` add pure functions `emptyBox()`, `startPack(run, pack)`, `revealInPack(run, index)`, `finishPack(run)`, treating a run without `box` as `emptyBox()`. Constraints, verbatim: `box.packsOpened` integer 0–24; `box.pack` is `{ cards, revealed }` or `null`; `box.pack.revealed` has the same length as `box.pack.cards`; `box.pulled` holds every card revealed so far in this box; `finishPack` returns the cards to merge and the updated run (`packsOpened += 1`, `pack = null`, and `boxOpened = true` when `packsOpened === 24`); a saved run with `boxOpened: true` and no `box` stays opened. Add cases for these to `shared/contract-tests.js`.
- [X] T014 [US1] In `progression/index.html` and `progression/progression-dom-refs.js` add the opener containers (pack area, pulled strip, action slot) and link `../shared/rarity.css` and `../shared/pack-reveal.css`; add `../shared/rarity.js`, `../shared/printings.js`, `../shared/pack-reveal.js` script tags before the progression scripts.
- [X] T015 [US1] In `progression/progression-render.js` and `progression/progression-init.js` replace the instant "Open box" with the pack flow: the first action (with confirm, final) starts the box and generates pack 1; after a pack completes the action slot shows "Next pack" (generates and shows the next pack) or "See pulled" when `packsOpened === 24`. Every reveal persists the run via `saveRun` (reveal state survives reload); when a pack completes, merge its cards with `mergeCardsIntoBacklog` (backlog first, then save the run with `finishPack`); on merge or save failure show exactly "Couldn't save your pulls — browser storage is unavailable or full.", do not advance `packsOpened`, and keep the pack so the user can retry; on fetch failure show the existing connection message and allow retry without losing progress.
- [X] T016 [US1] On page load in `progression/progression-init.js`, if `run.box.pack` exists resume it with `createPackReveal` using the saved `revealed` array (revealed cards already in the strip, the rest face down, no re-roll); if `box.pulled` exists repopulate the pulled strip.
- [X] T017 [P] [US1] Add the "See pulled" view in `progression/progression-render.js`: list every card in `box.pulled` with image, name, rarity badge and set; reuse `renderPackCardFace`-style markup shared with `pack-reveal.js` where possible.
- [X] T018 [US1] In `progression/progression-state.js` add `boxPhase(run)` returning `"not-started"` (`box.packsOpened === 0` and `box.pack === null`), `"in-progress"` (a pack is open, or `0 < packsOpened < 24`) or `"finished"` (`packsOpened === 24` or legacy `boxOpened: true`), and use it in `progression/progression-render.js`: not-started shows "Start box" (confirm, final), in-progress shows "Next pack" once the current pack is empty (or the pack itself while it is being revealed), finished shows "See pulled". `canOpenBox` returns false once the box has started (an in-progress box is continued, not reopened); "Complete stage" still requires `boxOpened` (set only when the 24th pack finishes); keep the existing hint messages in `canCompleteStage`/`canOpenBox`. Add `boxPhase` cases to `shared/contract-tests.js`.
- [X] T019 [US1] Draft integration (FR-019): in `draft/draft-start.js`, `draft/draft-session.js` and `draft/draft-render-all.js` keep each generated booster's cards together; before offering a booster's pick groups, sort that booster's cards with `sortPackByRarity` (draft boosters are not sorted today; `createPackReveal` expects them pre-sorted) and show it through `createPackReveal` (face down), then continue to its existing pick groups via `onPackComplete`; add the containers and `shared/pack-reveal.*`, `shared/rarity.*` includes to `draft/index.html`. Draft sessions stay in memory (no new persistence).
- [ ] T020 [US1] Confirm keyboard-only operation and `prefers-reduced-motion` behavior in both flows (Scenario 7) and that no card info appears in the DOM before reveal (inspect `aria-label`, `alt`, `title`, text).

**Checkpoint**: US1 fully usable in Progression Run and Draft.

---

## Phase 5: User Story 3 - See rarity clearly on every card (Priority: P2)

**Goal**: Glow plus explicit rarity name wherever a card with known rarity appears.

**Independent Test**: quickstart.md Scenario 4.

- [X] T021 [P] [US3] In `shared/pack-reveal.js` and `progression/progression-render.js` render revealed/pulled cards with `applyRarityGlow` and `buildRarityBadge` (unknown rarity shows "Unknown rarity" with no glow).
- [X] T022 [P] [US3] In `draft/draft-render-pick-group.js` and `draft/draft-render-chosen-strip.js` add the rarity badge next to the existing glow (draft pick cards keep their name caption).
- [X] T023 [US3] In the Collection card tag (`collection/collection-render-card-tag.js` and `collection/collection-card-tag-*.js`) show the glow and badge of the card's rarest known printing when `printings` exists; no glow or badge for cards without printings. Link `../shared/rarity.css` and add `../shared/rarity.js` and `../shared/printings.js` to `collection/index.html` (and to `tracker/index.html`, see T007, if it renders card tags).
- [ ] T024 [US3] Verify the badge text is legible with the glow disabled (devtools) and the contrast is acceptable on the dark theme (SC-005).

---

## Phase 6: User Story 4 - Booster artwork on the Progression Run (Priority: P2)

**Goal**: Stages shown as booster pictures: light grayed (not reached), clean (next), darkened (opened).

**Independent Test**: quickstart.md Scenario 5.

- [X] T025 [P] [US4] In `progression/progression-boosters.js` extend the cached set data (`ygoSetDates`) to also keep each set's image URL (field name from T001) and add `getSetImage(name)`; keep the 30-day cache rule and never fail the page when the image is missing. Extend the key's description in `specs/010-pack-opening-experience/data-model.md` if the cached shape changes.
- [X] T026 [P] [US4] Add pure `stageState(run, name, boosterList)` to `progression/progression-state.js`: `"opened"` for names in `completed` or the current stage with `boxOpened`, `"next"` for the current stage not yet `boxOpened`, `"locked"` otherwise; add cases to `shared/contract-tests.js`.
- [X] T027 [US4] In `progression/progression-render.js` replace the name lists with a booster rail: one item per stage in `MAINLINE_BOOSTERS` order showing the pack picture (`img` with `alt` = set name, or a CSS placeholder pack with the set name when no image), a state class from `stageState`, and an accessible label/tooltip "`<set name>` — reached/next/opened" (FR-007); mark the current stage with `aria-current`.
- [X] T028 [P] [US4] In `progression/progression.css` add the three states: `pack-locked` (light gray, reduced opacity/desaturated), `pack-next` (full color, subtle emphasis), `pack-opened` (darkened); horizontal scroll for the rail on narrow screens and scroll the current stage into view on load.
- [X] T029 [US4] Ensure the rail updates immediately when the last pack of a box finishes (stage turns darkened) and when the stage is completed (next stage turns clean).

---

## Phase 7: Polish & Cross-Cutting

- [X] T030 [P] Announce reveals politely to assistive tech after a card is revealed (`aria-live="polite"` text like "Revealed: <name>, <rarity>") in `shared/pack-reveal.js`; make sure nothing is announced before reveal.
- [ ] T031 Run every scenario in `specs/010-pack-opening-experience/quickstart.md` in a browser and fix issues.
- [X] T032 Run the contract tests (`shared/tests.html`, or `shared/profiles.test.js` and `shared/save-utils.test.js` via Node/VS Code runtime) and grep that no direct `localStorage` use exists outside `shared/save-utils.js`.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories. T002 before T021–T023; T003 before T005, T007, T008; T004 before T012 and T019; T005 before T015.
- US2 (Phase 3) can be built right after Phase 2. US1 (Phase 4) depends on Phase 2; within it T010/T012/T013 are independent, T011 needs T010, T014 needs T011, T015–T018 need T011–T014, T019 needs T011.
- US3 depends on Phase 2 (T002) and on the markup from T011/T017 for T021.
- US4 depends on T013 (state shape) only through T026; T027 depends on T025 and T026.
- Polish last.

## Parallel Opportunities

- T003 and T004 (Phase 2); T010, T012, T013 (US1); T021 and T022 (US3); T025, T026 and T028 (US4); T030 with T031.

## Implementation Strategy

1. **MVP**: Phases 1, 2 and 4 (printings stored + the face-down pack flow). Validate quickstart Scenarios 1, 2 and 6.
2. Add US2 views (Phase 3) and US3 rarity labels (Phase 5) for the full pull-history experience.
3. Add US4 booster pictures (Phase 6), then Polish.
