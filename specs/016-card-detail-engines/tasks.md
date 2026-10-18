# Tasks: Engines Panel in the Card Details Window

**Input**: Design documents from `/specs/016-card-detail-engines/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/engines-panel-contract.md, quickstart.md

**Tests**: Only the pure rules get automated checks (engine rules, the early-save marking and the "skip saved-early cards" rule), added to the existing contract tests as the plan states. The window itself is verified with `quickstart.md`.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in a `views/` folder and behaviour stays outside it; reuse the Workshop's engine rule (`maxAllowedInGroup`) instead of copying it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] add/remove from engines, [US2] create an engine from the card, [US3] the panel in every details window, [US4] keep cards while pulling

---

## Phase 1: Setup

- [X] T001 Create the folder `shared/views/` with an empty `shared/views/card-engines.css` (header comment: "Card details window: two-column layout and the engines panel. Rendering only")

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 Create `shared/engine-rules.js` with the constants at the top (`ENGINE_SEARCH_MIN_COUNT = 8`) and the pure functions from `data-model.md` over a collection blob: `listEngines(collection)`, `copiesInEngine(engine, cardId)`, `resolveOwnedCard(collection, card)` (by `id`, then `apiId` when both present, then lower-cased trimmed name; `null` when none), `canAddCopy(collection, engineId, ownedCard, extraAvailable)` (`{ ok, reason }`: allowed while the engine's count is below `min(ownedCard.quantityOwned + extraAvailable, MAX_COPIES_PER_SECTION)`, with reasons "No copies left to add." and "An engine holds at most 3 copies of a card."), `addCopy`, `removeCopy` (in place; entries merged by `cardId`; removing the last copy drops the entry) and `createEngineWithCard(collection, name, cardId, id)` (trimmed name, `null` when empty); it must use `maxAllowedInGroup` / `MAX_COPIES_PER_SECTION` from `collection/collection-allocation.js`, not redefine them
- [X] T003 Add contract tests for the engine rules to `shared/contract-tests.js`: `resolveOwnedCard` by id, by `apiId`, by name ignoring case and spaces, and `null` for an unknown card; the add limit with 1, 2 and 5 owned copies (never above 3) and with `extraAvailable`; adding merges into one entry per card; removing the last copy drops the entry; `createEngineWithCard` trims the name, returns one copy of the card, and returns `null` for an empty or whitespace name; engines stay independent (the same copy may be in two engines)
- [X] T004 Register `shared/engine-rules.js` in the Node harness list of `shared/profiles.test.js` (after `collection-allocation.js`) and in `shared/tests.html`; run `node shared/profiles.test.js` and confirm only the known booster-price money failures remain, if any
- [X] T005 Create `shared/card-detail-window.js` with `showCardDetailWindow({ card, title, detailHtml, buttons, pull })`: builds the body `<div class="card-detail-layout"><div class="card-detail-main">…detailHtml…</div><aside class="card-detail-engines" aria-label="Engines"></aside></div>`, opens it with `showModal({ title, bodyHtml, buttons })`, then calls `mountEnginesPanel(asideEl, card, pull)` when that function exists (so a page without the panel scripts still shows the details); the buttons and the focus handling stay those of `showModal`
- [X] T006 Change `openCardDetailModal` in `shared/card-detail-modal.js` and in `collection/collection-card-detail-modal.js` to build their body as before and open it through `showCardDetailWindow` instead of `showModal`; keep their signatures and add an optional fourth parameter `pull` to the shared one (the Workshop version keeps `maybeBackfillCardDetails` and `buildRarityCountsSectionHtml`); `extraHtml` of the shared version stays under the picture
- [X] T007 Write the two-column layout in `shared/views/card-engines.css`: `.modal-dialog:has(.card-detail-layout)` wider (named maximum width in a CSS variable at the top), `.card-detail-layout` as a grid with the details on the left and the engines column on the right with a divider, the engines column scrolling on its own when tall, and a narrow-window rule (max-width `700px`, the same limit as `BINDER_NARROW_MAX_PX`) that stacks the engines column below the details with no horizontal scrolling
- [X] T008 [P] Add the shared tags to every page that opens a card details window, in this order after the existing modal scripts: `<link>` for `shared/views/card-engines.css`; `<script>` tags for `collection/collection-allocation.js` (where not already loaded), `shared/engine-rules.js`, `shared/views/card-engines-view.js`, `shared/card-engines.js` and `shared/card-detail-window.js` — pages: `workshop/backlog.html`, `workshop/synergy.html`, `workshop/deckbuilding.html`, `workshop/completionist.html`, `store/sell.html`, `progression/index.html`, `draft/index.html`, `tracker/index.html`; `shared/card-detail-window.js` must load before `shared/card-detail-modal.js` and `collection/collection-card-detail-modal.js`

**Checkpoint**: the rules pass their tests; details windows show the two-column layout (the right column is still empty until User Story 1); nothing else changed.

---

## Phase 3: User Story 1 - Add or remove a card from my engines (Priority: P1) 🎯 MVP

**Goal**: The details window lists the profile's engines with this card's count and lets the user add or remove one copy, with the count updating at once.

**Independent Test**: `quickstart.md` section 2.

- [X] T009 [P] [US1] Create `shared/views/card-engines-view.js` with `renderEnginesPanel(containerEl, model, handlers)` per the contract: heading "Engines", one row per engine (name, `×count`, a remove button disabled at 0 and an add button disabled with its reason in `title` and `aria-describedby` when `canAdd` is false, each with an accessible name such as "Add <card> to <engine>"), the empty-state text when there are no engines, the read-only note when `readOnlyReason` is set, and an `aria-live="polite"` region for announcements; DOM only, no state and no rules
- [X] T010 [US1] Create `shared/card-engines.js` with the constant `ANNOUNCE_CLEAR_MS = 4000` at the top and `mountEnginesPanel(containerEl, card, pull)`: read the saved collection with `loadData(profileKey("ygoCollection"))` (empty collection when none), resolve the owned card with `resolveOwnedCard`, build the model (per engine `count`, `canAdd`, `addReason` through `canAddCopy`; `readOnlyReason` "Engines hold cards from your collection." when the card is not owned and there is no pull context) and draw with `renderEnginesPanel`; the add and remove handlers apply `addCopy` / `removeCopy` to the blob, write it back with `saveData(blob, profileKey("ygoCollection"))`, redraw from the saved data, announce "Added to <engine>" / "Removed from <engine>", and call `onCardEnginesChanged()` when the page defines it; a failed `saveData` must not change what is shown and must announce a clear error
- [X] T011 [US1] Style the panel in `shared/views/card-engines.css`: list rows with the name taking the space and the count and buttons aligned right, the disabled add look, the announcement line, the read-only note, and focus rings; named sizes in CSS variables at the top
- [X] T012 [P] [US1] Define the page hook `onCardEnginesChanged` where the page keeps the collection in memory so a later save cannot overwrite the change: in `workshop/workshop-backlog-init.js`, `workshop/workshop-synergy-init.js` and `workshop/workshop-deck-init.js` set `collection = loadCollection()` then call `renderAll()`; in `store/store-sell.js` call `reloadStoreCollection()` then `renderSellList()`; in `tracker/` define it next to its collection state (find the file that owns `let collection` and saves it with `saveCollection`) to reload that collection from storage and redraw; no hook for Progression, Draft or the completionist page (they read storage per operation)

**Checkpoint**: User Story 1 works on its own: engines listed with counts, add and remove with limits and announcements, Workshop and Store/Tracker stay in sync.

---

## Phase 4: User Story 2 - Create a new engine from the card (Priority: P1)

**Goal**: The panel creates a new engine from a name, already holding the card.

**Independent Test**: `quickstart.md` section 3.

- [X] T013 [US2] Add the new-engine form to `shared/views/card-engines-view.js`: a labelled text field and a "Create and add" button (Enter submits), an inline message under it for an empty name, handler `onCreate(name)`; the field stays under the list so it is always reachable
- [X] T014 [US2] In `shared/card-engines.js` add the create handler: `createEngineWithCard(blob, name, ownedCard.id, nextId("engine"))` (an empty name only shows the message and writes nothing), place the new engine at the top of the displayed list, write the collection, announce "Created <engine>", and call `onCardEnginesChanged()`; the card must be owned for this (a read-only panel hides the form's button as disabled)
- [X] T015 [US2] Make sure the Workshop's own engine list shows the new engine at once after `onCardEnginesChanged()` and that duplicate names are allowed as in the Workshop; add one contract test in `shared/contract-tests.js` that two engines with the same name can be created from the rules

**Checkpoint**: User Stories 1 and 2 work: create from the card and manage counts.

---

## Phase 5: User Story 3 - The panel is in every details window (Priority: P1)

**Goal**: All nine screens that open card details show the panel, with extras kept and cards not owned handled.

**Independent Test**: `quickstart.md` section 4.

- [X] T016 [US3] Verify each of the nine entry points reaches `showCardDetailWindow` (Backlog tags, engine tiles and deck tiles via `openCardDetailsFromPicture`, `store/views/sell-view.js`, `workshop/workshop-completionist-init.js`, `shared/pack-reveal.js`, `draft/draft-render-pick-group.js`, `tracker/tracker-render-minicard.js`) and fix any caller that still calls `showModal` for a card, by opening each screen's window and confirming the right column appears
- [X] T017 [US3] Handle windows with their own buttons or extra information: confirm `draft/draft-render-pick-group.js`'s "Keep This Card" and "Close" buttons, and the printing line (`extraHtml`) of the completionist binder, still appear and work next to the panel; adjust `shared/card-detail-window.js` only if the layout hides them
- [X] T018 [US3] Complete the read-only behaviour in `shared/card-engines.js`: for a card not owned (no match from `resolveOwnedCard`, no pull context) every add control is disabled and the note says "Engines hold cards from your collection."; for a card the user owns in another rarity the panel works (name or `apiId` match, as in the completionist binder's missing slots)
- [X] T019 [US3] Add the engine search to the view and the behaviour: when the profile has more than `ENGINE_SEARCH_MIN_COUNT` engines show a labelled search field above the list that filters by name (case-insensitive) without changing any data, and keep the list scrolling inside the panel
- [X] T020 [US3] Check the narrow layout at phone width in each of the nine screens (details above, engines below, no horizontal scrolling) and fix `shared/views/card-engines.css` where a screen's own dialog styles interfere

**Checkpoint**: The panel works in every card details window, including for cards not owned and with many engines.

---

## Phase 6: User Story 4 - Keep interesting cards while pulling (Priority: P2)

**Goal**: A pulled or picked card can be added to an engine; its copy is saved to the Backlog at once and never saved twice.

**Independent Test**: `quickstart.md` section 5.

- [X] T021 [US4] In `progression/progression-state.js` add `markCardSavedEarly(run, source, card)` (`source` is `"box"` or `"extra"`; finds the first card of that pack with the same name, set, rarity and set number that is not yet flagged, sets `savedEarly: true` on a copy of it, and returns a new run; unchanged run when none is found) and `unsavedCopiesOf(run, source, card)` (count of identical unflagged copies); make `finishPack` and `finishExtraPack` return only the cards without `savedEarly` in `cards`
- [X] T022 [US4] Add contract tests to `shared/contract-tests.js`: marking flags exactly one of two identical copies and leaves other cards alone; marking twice flags both; marking with no copy left changes nothing; `finishPack` / `finishExtraPack` skip flagged cards and still return the others; the Backlog ends with exactly the pulled copies when one is flagged and merged early (use `mergeCardsIntoBacklog` for the early copy and for the rest)
- [X] T023 [US4] In `shared/backlog-merge.js` make `mergeCardsIntoBacklog` ignore cards with `savedEarly` (a safety net so a flagged copy is never merged twice), and add a contract test for it
- [X] T024 [US4] In `progression/progression-init.js` define `pullContextFor(card)` for the box pack and the bought pack: `canSave` true, `availableCopies()` from `unsavedCopiesOf`, and `saveEarly()` that (1) merges that single copy with `mergeCardsIntoBacklog([copy])`, (2) marks it with `markCardSavedEarly` and saves the run with `persistRun` (updating `currentRun`), and (3) if step 2 fails undoes step 1 by removing that copy from the saved collection (lower `quantityOwned` and its printing) and returns false; the early save must never run when `availableCopies()` is 0
- [X] T025 [US4] In `shared/pack-reveal.js` pass `pullContextFor(card)` (when the page defines it) as the pull context to `openCardDetailModal` in `buildRevealedCardElement`, and let the "See pulled" list use the same path; update the file's header comment
- [X] T026 [US4] In `shared/card-engines.js` use the pull context: effective owned for the add check is the owned copies plus `pull.availableCopies()`; when an add needs another copy, call `pull.saveEarly()` first and re-read the saved collection, and when it returns false show the error and change nothing; creating an engine for a not yet owned pulled card also runs the early save first
- [X] T027 [US4] In the Booster Draft (`draft/draft-pick-handling.js`, `draft/draft-render-pick-group.js`, `draft/draft-render-finished.js` or the chosen strip, `draft/draft-backlog-merge.js`): give kept cards a pull context (`canSave` true; `saveEarly()` merges that kept card, flags it `savedEarly` in `session.keptCards`, and returns false on failure) when their details are opened from the kept cards, give unpicked group cards and the draft reveal strip a context with `canSave: false` so the panel is read-only with the note "Keep this card first", and make `draft-backlog-merge.js` skip flagged kept cards at the end
- [X] T028 [US4] Add the read-only note for `canSave: false` in `shared/card-engines.js` and the "Adding saves this card to your backlog now" note for pull windows whose card is not yet owned

**Checkpoint**: Pulling and drafting work with the panel; no copy is duplicated or lost across finishing, reopening and failed saves.

---

## Phase 7: Polish & Cross-Cutting

- [X] T029 Check every number added by this feature is a named constant at the top of its file, that `shared/views/` contains only DOM and CSS, and that `shared/card-engines.js` never touches decks, balance or pack contents
- [ ] T030 [P] Verify keyboard-only use (open the window, reach the engine rows, add/remove, search, the new-engine field, Escape closes) and that every change is announced in the live region
- [ ] T031 Run `node shared/profiles.test.js` and open `shared/tests.html`; then walk through every section of `quickstart.md` (panel, new engine, nine windows, pulling, draft, storage failure, Store and Tracker staying in sync)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories**. T002 → T003 → T004; T005 → T006 → T007; T008 can run once the file names are fixed (it needs T005 and the view/behaviour names).
- **US1** needs Phase 2. T009 and T011 in parallel; T010 uses T009; T012 in parallel with them.
- **US2** builds on the panel from US1 (T009, T010).
- **US3** checks the whole window: T016 after US1; T017–T020 edit the same files in sequence.
- **US4** needs US1 (panel and add) and US3's read-only rules; T021 → T022 → T023 are pure and can start after Phase 2; T024 → T025 → T026 follow; T027 (draft) is independent of the Progression tasks but uses T026's behaviour; T028 last.
- **Polish** after the stories being shipped.

### Parallel opportunities

- T008 with T002–T007 once names are fixed.
- T009, T011 and T012 in US1.
- T021–T023 (pure early-save rules) can be built in parallel with US1–US3.
- T030 in Polish.

## Implementation Strategy

- **MVP**: Phase 1, Phase 2 and User Story 1 (T001–T012): engines listed in every details window with add/remove.
- **Then**: US2 (create from the card), US3 (every window, read-only and search) and US4 (pulls and draft).
- Validate after each phase with the matching `quickstart.md` section; the Backlog, Store, Tracker and the pack opening must keep working after Phase 2.
