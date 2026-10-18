# Tasks: Completionist Binder

**Input**: Design documents from `/specs/015-completionist-binder/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/completionist-binder-contract.md, quickstart.md

**Tests**: Only the pure rules (slot building, ownership matching, completion, unmatched copies) get automated checks, added to the existing contract tests as the plan states. The UI is verified with `quickstart.md`.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in a `views/` folder and behaviour stays outside it; do not copy code that can be shared.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] see a whole set, [US2] one slot per rarity with glow and tag, [US3] details and read-only

---

## Phase 1: Setup

- [X] T001 Create the folder `workshop/views/` with an empty `workshop/views/completionist.css` (header comment: "Completionist binder layout. Rendering only")

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 Move `reachedBoosters(run, boosterList)` from `store/store-state.js` to `progression/progression-state.js` (same body: completed stages plus the current one, in booster-list order) and delete it from the Store file; confirm `store/buy.html` and `store/sell.html` still load `progression-state.js` before `store-state.js`, and that `node shared/profiles.test.js` shows no new failure from the move
- [X] T003 In `shared/pack-pool.js` extract the request into `fetchSetApiCards(setName)`: returns the raw card list as a Promise, caches it per set in a Map (a rejected request is NOT cached), and have `fetchSetCardPool` build its pool from it with identical results; no other behaviour change
- [X] T004 Create `shared/set-slots.js` with the constants at the top (`UNMATCHED_NOTE_MIN = 1`, `PERCENT_DIGITS = 0`) and the pure functions from the contract: `buildSetSlots(apiCards, setName)` (one slot per card and rarity among the `card_sets` entries whose `set_name` equals `setName`, merging the regional set numbers of one printing (prefer the `-EN` number): `{ key: "<apiId>|<rarity lower-cased>", apiId, name, setName, setCode, rarity, card }` with `card` = `extractCardFields(apiCard)` plus `name` and `effect` (from `desc`); ordered by set code, then `rarityRank(rarity)` ascending, then name), `ownedFor(slot, collectionCards)` (printings match when same card by `apiId` if both present else lower-cased name, same set name, same rarity ignoring case, and same set number when the printing recorded one; sum of their `quantity`), `completion(slots, collectionCards)` (`{ owned, total, percent, complete }`, `percent = round(100 × owned / total)` with `PERCENT_DIGITS` decimals and 0 when `total` is 0, `complete = total > 0 && owned === total`) and `unmatchedCopies(collectionCards)` (per card `max(0, quantityOwned − Σ printing quantity)` plus the quantities of printings with no set or no rarity)
- [X] T005 Add contract tests for the set rules to `shared/contract-tests.js`: a card with three `card_sets` entries in the set and one in another set gives exactly three slots in set-code order; two cards interleave by set code; ownership counts only a printing with the same set and rarity (another rarity or another set does not count); a printing with a recorded set number matches only that slot; two different cards with one name casing difference match by name; `completion` for 0, partial and full ownership and for an empty set; `unmatchedCopies` for old cards without printings, printings with no rarity, and a fully recorded card (0)
- [X] T006 Register `shared/set-slots.js` in the Node harness list of `shared/profiles.test.js` (after `rarity.js` and `printings.js`, and after `card-api.js` if the harness needs `extractCardFields` there) and in `shared/tests.html`; run `node shared/profiles.test.js` and confirm only the known booster-price money failures remain, if any
- [X] T007 Create `collection/binder-controller.js`: `createBinder({ container, buildSlot })` returning `{ render(items, focus), reset() }`; it owns the offset, reads the narrow-window query `(max-width: BINDER_NARROW_MAX_PX px)` through `matchMedia`, clamps with `clampOffset`, turns with `turn`, draws through `renderBinderView(container, { cards: items, offset, pagesPerView, focus }, { onPrevious, onNext, buildSlot })`, and redraws on a media-query change (keeping the offset aligned through `clampOffset`); constants for the direction values come from `binder-paging.js`
- [X] T008 Refactor `collection/collection-binder-state.js` to use `createBinder({ container: backlogListEl, buildSlot: buildBinderSlot })`: keep `panelAllows`-based `buildBinderSlot`, keep `resetBinder()` and `renderBinder(cards)` as thin wrappers over the controller so `collection-render-backlog.js`, `collection-search-wiring.js` and `shared/backlog-panel.js` need no change; add `collection/binder-controller.js` to the script tags of `workshop/backlog.html`, `workshop/synergy.html` and `workshop/deckbuilding.html` before `collection-binder-state.js`, and re-check `quickstart.md` section 2 of feature 014 (paging, resets, narrow window) still behaves the same

**Checkpoint**: set rules pass their tests; the Backlog binder behaves exactly as before; the pack pool still works; nothing new is visible yet.

---

## Phase 3: User Story 1 - See a whole set and what I am missing (Priority: P1) 🎯 MVP

**Goal**: A new Workshop page lets the user choose an available set and shows every slot of the set in binder pages, owned in colour and missing greyed, with a progress line.

**Independent Test**: `quickstart.md` sections 2 and 5: the chooser lists the right sets, a chosen set shows all its slots in set order with page turning, the colours and the progress line match the owned printings, empty and loading/error/no-sets states behave.

- [X] T009 [US1] Create `workshop/completionist-state.js`: `availableSets()` (Progression Run profile: `reachedBoosters(loadRun(profile.id) || newRun(MAINLINE_BOOSTERS), MAINLINE_BOOSTERS)`; Sandbox profile: all of `MAINLINE_BOOSTERS`; both reversed so the most recent is first), `loadSetSlots(setName)` (calls `fetchSetApiCards`, builds slots with `buildSetSlots`, stores them in a session `Map`, does not store failures) and the module state `chosenSet` and `status` ("idle", "loading", "error", "ready", "no-sets")
- [X] T010 [P] [US1] Create `workshop/views/completionist-view.js`: `renderCompletionistShell(model, handlers)` drawing into a page container: a labelled `<select>` set chooser (most recent first, `aria-label` "Choose a set"), the progress line in an `aria-live="polite"` element ("142 of 380 owned · 37%", or "Set complete" when complete), the unmatched-copies note (only when `unmatched >= UNMATCHED_NOTE_MIN`), a loading line, an error line with a Retry button, the no-sets explanation, and the container element where the binder is drawn; no state and no rules inside
- [X] T011 [P] [US1] Create `workshop/views/completionist-slot-view.js` with `buildCompletionistSlot(slot, { owned, onOpen })` for the basic slot: the card picture from `slot.card.imageSmall` (`loading="lazy"`, stand-in with the card name when there is none or it fails, reusing `buildCardFace` from `collection/views/card-slot-view.js`), colour when `owned > 0` and a `completionist-missing` class when `owned === 0`, and the text row under the picture (`×N` when owned, "Missing" otherwise) using the same fixed foot height as the Backlog binder slots
- [X] T012 [US1] Style the page in `workshop/views/completionist.css`: header row with the chooser and the progress line, the binder container sized like the Backlog binder (reuse `.binder`, `.binder-page`, `.binder-slot` from `collection/views/binder.css`), the greyed look for `.completionist-missing .card-face` (`filter: grayscale(1)`, reduced opacity, named values in CSS variables at the top), the "Missing" text style, and a narrow-window rule that does not scroll horizontally
- [X] T013 [US1] Create `workshop/completionist.html` modelled on `workshop/backlog.html`: same stylesheets and shared scripts (theme, modal, rarity, printings, areas, nav, profile scripts, `card-api.js`, `money.js` only if needed), plus `collection/binder-paging.js`, `collection/views/card-slot-view.js`, `collection/views/binder-view.js`, `collection/binder-controller.js`, `shared/set-slots.js`, `shared/pack-pool.js`, `draft/mainline-boosters.js`, `progression/progression-state.js`, `workshop/completionist-state.js`, the two new views, the stylesheets `collection/views/binder.css` and `workshop/views/completionist.css`, and `workshop-completionist-init.js`; title "Workshop · Completionist Binder"
- [X] T014 [US1] Create `workshop/workshop-completionist-init.js`: read the active profile with `getActiveProfile()`, compute `availableSets()` (status "no-sets" when empty), choose the first set by default, load its slots (status "loading" → "ready" or "error" with Retry that calls `loadSetSlots` again), create the binder with `createBinder` using `buildCompletionistSlot`, compute `completion` and `unmatchedCopies` from `loadCollection()`'s cards, re-render the shell on a set change (calling the binder's `reset()` first), and re-read the saved collection and redraw on `pageshow` so returning to the page shows the current ownership
- [X] T015 [US1] Add the page to the Workshop area in `shared/areas.js`: `{ label: "Completionist Binder", href: "workshop/completionist.html" }` after Deckbuilding

**Checkpoint**: User Story 1 works on its own: choose a set, see all its slots paged, owned in colour and missing grey, progress line, and the loading/error/no-sets states.

---

## Phase 4: User Story 2 - Every rarity is its own slot, with glow and tag (Priority: P1)

**Goal**: Each rarity of a card is its own slot; every slot shows its rarity tag and owned slots also show their rarity glow.

**Independent Test**: `quickstart.md` section 3.

- [X] T016 [US2] In `workshop/views/completionist-slot-view.js` add the rarity tag to every slot with `buildRarityBadge(slot.rarity)`, placed over the lower edge of the card picture so the fixed foot row is unchanged
- [X] T017 [US2] In `workshop/views/completionist-slot-view.js` apply the glow to owned slots only with `applyRarityGlow(frameEl, slot.rarity)` on the slot's picture frame (a missing slot must have no glow class and no `--glow-color`); keep the `shared/rarity.css` glow classes loaded in `workshop/completionist.html`
- [X] T018 [US2] Set the slot's accessible name to "<name>, <rarity>, owned ×N" or "<name>, <rarity>, missing" (never colour alone) and add its style for the tag over the picture and for slots whose rarity is long (ellipsis, full text in `title`) to `workshop/views/completionist.css`
- [X] T019 [US2] Make sure `workshop/completionist-state.js` passes `ownedFor(slot, collectionCards)` per slot so only the matching rarity is coloured, and add one more case to the contract tests in `shared/contract-tests.js`: a card owned in rarity A of the set leaves its rarity B slot with ownership 0

**Checkpoint**: Multi-rarity cards show one slot per rarity, tags everywhere, glow only on owned slots; US1 still passes.

---

## Phase 5: User Story 3 - Open a card and know where I stand (Priority: P2)

**Goal**: Any slot opens the card's details; the binder never changes saved data.

**Independent Test**: `quickstart.md` section 4.

- [X] T020 [US3] In `workshop/views/completionist-slot-view.js` make the picture a button that calls `onOpen()` (click, Enter, Space), with no `draggable`, no stepper and no remove control
- [X] T021 [US3] In `workshop/workshop-completionist-init.js` pass `onOpen` that opens `openCardDetailModal` with the owned collection card when the user has it (so printings show) and with `slot.card` for a missing slot; load `shared/card-detail-modal.js`, `card-tags-builder.js`, `card-effect-builder.js` and the printings summary script in `workshop/completionist.html`, and check the details window shows the card for a missing slot (image, type, effect) without errors
- [X] T022 [US3] Verify the page never writes: search `workshop/completionist-state.js`, `workshop/workshop-completionist-init.js` and `workshop/views/` for `saveCollection`, `saveData`, `saveRun`, `setItem` and `mergeCardsIntoBacklog`, and confirm none is called

**Checkpoint**: All three user stories work; the page is read-only.

---

## Phase 6: Polish & Cross-Cutting

- [X] T023 Check every number added by this feature is a named constant at the top of its file, that `workshop/views/` contains only DOM and CSS, and that `collection/binder-controller.js` has no Backlog-specific code
- [ ] T024 [P] Verify keyboard-only use (chooser, page buttons, every slot, Retry) and that owned versus missing is stated in text, not only colour
- [ ] T025 Run `node shared/profiles.test.js` and open `shared/tests.html`; then walk through every section of `quickstart.md` (set choice, rarities, details and read-only, network panel check of one request per set and pictures only for visible pages, offline retry, unmatched note, no-sets message, narrow window)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories**. T002 and T003 are independent of each other; T004 needs T003 only for `extractCardFields` availability in tests; T005 → T006 follow T004; T007 → T008 follow each other and are independent of T002–T006.
- **US1** needs Phase 2. T009 first; T010, T011, T012 in parallel; then T013 (references all), T014, T015.
- **US2** builds on the slot view from US1 (T011); T016–T018 edit the same files in sequence; T019 touches the tests.
- **US3** builds on the slot view and init from US1; T020 → T021 → T022.
- **Polish** after the stories being shipped.

### Parallel opportunities

- T002 with T003; T007–T008 with T004–T006 (different files).
- T010, T011 and T012 in US1 (different files).
- T024 in Polish.

## Implementation Strategy

- **MVP**: Phase 1, Phase 2 and User Story 1 (T001–T015): choose a set and see which cards are owned or missing, with the progress line.
- **Then**: US2 (rarity tags and glow; multi-rarity slots already exist from T004), then US3 (details and read-only checks).
- Validate after each phase with the matching `quickstart.md` section; the Backlog binder and the Store must keep working after Phase 2.
