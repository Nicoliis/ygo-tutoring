# Tasks: Progression Screens and Starting Set

**Input**: Design documents from `/specs/017-progression-screens/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/progression-screens-contract.md, quickstart.md

**Tests**: Only the pure rules get automated checks, added to the existing contract tests as the plan states. The pages are verified with `quickstart.md`.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in `progression/views/` and behaviour stays outside it; **commit after each task or small group of related tasks** once its checks pass (standing request); the old single page keeps working until the new screens replace it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] starting set, [US2] screen 1 progression, [US3] screen 2 stage pull, [US4] screen 3 booster pull, [US5] navigation

Phases are ordered by dependency (the new pull screens exist before the old page stops showing packs), not by priority.

---

## Phase 1: Setup

- [X] T001 Create the folder `progression/views/` (rendering only) and note its purpose in a header comment of its first file in the tasks below

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 In `progression/progression-state.js` add the pure start-set rules: `newRun(boosterList, startSet)` (current = `startSet` when it is in the list, else the first set; records `startSet` only when given), `startIndex(run, boosterList)` (index of `run.startSet`, 0 when absent or unknown), `stageState` returning `"skipped"` for names before `startIndex`, `reachedBoosters` including the skipped sets (skipped + completed + current, list order) and `runSummary` using `total = boosterList.length − startIndex`; keep every existing behaviour for runs without `startSet`
- [X] T003 Add contract tests to `shared/contract-tests.js`: a run started at the third of five sets has `current` there, `startIndex` 2 and `startSet` recorded; sets before it are `"skipped"` and are in `reachedBoosters`; `runSummary` shows "Stage 1/3" for it; completing stages advances from the start set; an unknown start set falls back to the first; a saved run without `startSet` behaves exactly as before (same state, summary and reached sets); `remainingStages` is unchanged; run `node shared/profiles.test.js` and confirm "profiles contract: OK"
- [X] T004 [P] Create `progression/views/booster-tile-view.js` with `buildBoosterTile(name, { state, label, amount, selectable, selected, onSelect })`: the picture from `getSetImage(name)` or the named placeholder when there is none or it fails, the caption with the name, the state class (`pack-opened`, `pack-next`, `pack-locked`, `pack-skipped`), an optional `×amount` badge and, when `selectable`, a button with `aria-pressed` and an accessible name; moved from `buildBoosterPack` / `buildPlaceholderPack` in `progression/progression-render.js` with the same markup, and have `progression-render.js` call it so the old page looks the same
- [X] T005 [P] Style the new tile states in `progression/progression.css`: `.pack-skipped` (locked look with a "skipped" tint distinct from `.pack-locked`), the `×amount` badge, and the selected state of a selectable tile; named sizes in CSS variables at the top
- [X] T006 Create `progression/progression-context.js` holding the state shared by every screen, moved from `progression/progression-init.js` and `progression/progression-render.js`: `activeProfile`, `currentRun`, `busy`, `persistRun(run)`, `setProgressionStatus`, `countOwnedCards`, `stageLabel`, `renderNoRules`, `pullContextFor(card)` and `SAVE_PULLS_ERROR` / `OPEN_PACK_ERROR`, plus `initRunContext()` returning false (after drawing the "no run rules" panel) for a profile without run rules; load it in `progression/index.html` before the init file and make the old files use it (no behaviour change)

**Checkpoint**: the rules and their tests pass, the tile view and shared context exist, and the old Progression page behaves exactly as before.

---

## Phase 3: User Story 3 - Screen 2: current stage pull (Priority: P1)

**Goal**: A page for the stage's box with the opener, the current pack's strip and an always-visible, real-time "Pulled this box" list ordered rarest first.

**Independent Test**: `quickstart.md` section 4.

- [X] T007 [P] [US3] Create `progression/views/stage-view.js` with `renderStage(rootEl, model)` (the opener panel: box progress text and bar, the hint, the pack area, the action slot, the current pack's strip, and an empty `#pulledList` panel "Pulled this box (n)") and `renderPulledList(listEl, cards)` (redraws only that panel from `cards`: rarest first, then name, identical cards grouped with a count, each card opening its details through `buildRevealedCardElement`); plus the not-started and finished messages with a link to `index.html`; moved from `buildOpenerPanel` / `buildPulledList` / `groupPulled` in `progression-render.js`
- [X] T008 [US3] Create `progression/progression-stage.js` (behaviour of screen 2), moved from `progression-init.js`: `mountPack`, `completePack`, `actionAfterPack`, `onNextPack`, `startNewPack`, `mountOpener`, `updateBoxProgress`; each `onReveal` persists the run and then calls `renderPulledList` with `getBox(currentRun).pulled` so the list updates in real time; remove the "See pulled" toggle (the list is always visible); when the box is finished show the finished message instead of an action
- [X] T009 [US3] Create `progression/stage.html` modelled on `progression/index.html` (same stylesheets and shared scripts, title "Current Stage Pull") loading `progression-context.js`, `views/booster-tile-view.js` only if needed, `views/stage-view.js` and `progression-stage.js`; confirm a started box can be pulled from it and the old page still works
- [X] T010 [US3] Handle the states of `stage.html`: box not started (message and link to `index.html`), box finished (message pointing to `index.html` to complete the stage), run finished, and a profile without run rules; check that leaving and returning mid-pack restores the pack, the strip and the list from the saved run

**Checkpoint**: Screen 2 works on its own; the old page still works too.

---

## Phase 4: User Story 4 - Screen 3: booster pull (Priority: P2)

**Goal**: A page listing only the loose boosters the user has, as tiles with amounts, and opening them with the same reveal.

**Independent Test**: `quickstart.md` section 5.

- [X] T011 [P] [US4] Create `progression/views/booster-pull-view.js` with `renderBoosterPull(rootEl, model, handlers)`: a tile per booster with amount > 0 (`buildBoosterTile` with `amount`) and an "Open one" button (disabled with a reason while a loose pack is open), the empty state ("You have no boosters" with a link to `../store/buy.html`), and the open-pack panel (title, hint, pack area, action slot, pulled strip and a pulled list using `renderPulledList` from `stage-view.js`); model = `{ boosters: [{ name, amount }], openPack | null, busy }`
- [X] T012 [US4] Create `progression/progression-boosters-screen.js` (behaviour of screen 3), moved from `progression-init.js`: `onOpenBought` (generate first, then `startExtraPack`), `mountExtraPack` with `createPackReveal`, `completeExtraPack`, `extraAction`, with each `onReveal` also redrawing the loose pack's pulled list; amounts come from `run.packInventory` filtered to > 0; finishing a pack saves its cards to the Backlog and redraws the list so an empty set disappears
- [X] T013 [US4] Create `progression/boosters.html` modelled on `stage.html` (title "Booster Pull") loading the context, `views/booster-tile-view.js`, `views/stage-view.js` (for the pulled list), `views/booster-pull-view.js` and `progression-boosters-screen.js`; check it with an inventory of two sets, an open pack that survives leaving the page, and the empty state
- [X] T014 [US4] Make the loose-booster rules explicit in the screen: "Open one" stays disabled while a loose pack is open (with the reason), a loose pack is allowed whatever state the stage box is in, and the displayed amounts always match the saved inventory (re-read on show and after each change)

**Checkpoint**: Screen 3 works on its own.

---

## Phase 5: User Story 2 - Screen 1: progression and the booster list (Priority: P1)

**Goal**: The Progression page becomes the home of the run with no pack on it.

**Independent Test**: `quickstart.md` section 3.

- [X] T015 [P] [US2] Create `progression/views/home-view.js` with `renderHome(rootEl, model, handlers)`: the summary line, the stage panel (heading, "Start box", "Complete stage", "Build decks", the hint), links to Current Stage Pull and Booster Pull (with the amount of loose boosters when there are some), the booster list (the rail, `buildBoosterTile` per set with its state and the current set scrolled into view), the completed stages and the "Run finished" panel; moved from `renderRun`, `buildBoosterRail` and the stage panel code of `progression-render.js`
- [X] T016 [US2] Create `progression/progression-home.js` (behaviour of screen 1): `onStartBox` (confirm, `startNewPack`, then go to `stage.html`), `onCompleteStage` with `chooseDuelResult` and the duel rewards (moved unchanged from `progression-init.js`), and the initial draw with the set dates refresh that never touches another screen
- [X] T017 [US2] Switch `progression/index.html` to the new files (`progression-context.js`, `views/booster-tile-view.js`, `views/home-view.js`, `progression-home.js`); it must show no pack area, no pulled strip and no bought-boosters panel; confirm Start box now opens screen 2 and Complete stage still works
- [X] T018 [US2] Delete `progression/progression-init.js` and `progression/progression-render.js` once nothing references them (search the pages and scripts), and delete the dead styles they used from `progression/progression.css`

**Checkpoint**: Screens 1, 2 and 3 all work; the old single page is gone.

---

## Phase 6: User Story 1 - Choose the set where my run starts (Priority: P1)

**Goal**: A new run begins at a set the user chooses, shown in the usual booster look.

**Independent Test**: `quickstart.md` section 2.

- [X] T019 [US1] In `progression/views/home-view.js` add the start-set chooser for a not-started profile (model `run: null`): the booster list as selectable tiles (`buildBoosterTile` with `selectable`), the selected one marked, and a "Start here" button disabled until a set is chosen; no stage panel, no actions
- [X] T020 [US1] In `progression/progression-home.js` handle a profile without a run: draw the chooser instead of creating a run at once; confirming `confirmDialog("Start your run at <set>? This can't be undone.")` saves `newRun(MAINLINE_BOOSTERS, name)` with `saveRun`, redraws the started screen, and cancelling saves nothing; remove the code that created and saved a run on first load
- [X] T021 [US1] Show the skipped sets in the booster list of a started run (`stageState` "skipped", with the tile title explaining "skipped, buy its boosters in the Store"), and check in the Store (`store/buy.html`) that those sets' boosters are offered, that older runs without `startSet` are untouched and that the profile picker's summary still works
- [X] T022 [US1] Make sure no other page creates a run behind the chooser: search for `newRun(` calls and keep `loadRun(...) || newRun(...)` fallbacks (Store, completionist binder, profile picker) read-only, with no `saveRun` on those paths

**Checkpoint**: A new profile chooses its starting set; older profiles are unchanged.

---

## Phase 7: User Story 5 - Move between the three screens (Priority: P2)

**Goal**: The three screens are in the sidebar and linked from each other.

**Independent Test**: `quickstart.md` section 6.

- [X] T023 [US5] In `shared/areas.js` list the three pages under Run in order: "Progression Run" (`progression/index.html`), "Current Stage Pull" (`progression/stage.html`), "Booster Pull" (`progression/boosters.html`); check the sidebar marks the open page on each
- [X] T024 [US5] Add the links between screens: screen 1 to screens 2 and 3 (done in T015), screens 2 and 3 back to screen 1, empty states to the Store or screen 1 as the spec says; check that an open stage pack and an open loose pack survive every move between pages
- [ ] T025 [US5] Check the three pages for a profile without run rules (the "No run rules" panel on each), at phone width (no sideways scrolling; the rail wraps) and by keyboard (choose a set, start the box, pull, open a loose pack)

---

## Phase 8: Polish & Cross-Cutting

- [X] T026 Check every number added by this feature is a named constant at the top of its file, that `progression/views/` contains only DOM and CSS, and that no file still references the removed `progression-init.js` / `progression-render.js` (including specs' quickstart text and `shared/tests.html`)
- [ ] T027 Run `node shared/profiles.test.js` and open `shared/tests.html`; then walk through every section of `quickstart.md` (start-set choice, the three screens, real-time pulled list, loose boosters, navigation, phone width, keyboard)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories**. T002 → T003 first; T004 and T005 in parallel; T006 after T004 (the old page uses the tile and the context together).
- **US3 (T007–T010)** needs Phase 2; T007 and T008 can be written in parallel, T009 joins them.
- **US4 (T011–T014)** needs Phase 2 and the pulled list from T007.
- **US2 (T015–T018)** needs US3 and US4 working (the old page stops showing packs at T017) and Phase 2.
- **US1 (T019–T022)** needs the home view and behaviour from US2.
- **US5 (T023–T025)** after the three screens exist.
- **Polish** last.

### Parallel opportunities

- T004 with T005; T007 with T011; T015 with T019's view part only after T015 exists.
- A second person could build US4 (screen 3) in parallel with US3 (screen 2) once Phase 2 is done.

## Implementation Strategy

- **MVP**: Phase 1, Phase 2 and User Story 3 (T001–T010): a stage pull screen with the real-time rarity-ordered list, usable while the old page still exists.
- **Then**: US4 (loose boosters), US2 (switch the home screen and remove the old page), US1 (starting set), US5 (navigation and checks).
- Validate after each phase with the matching `quickstart.md` section; the Store, the completionist binder and the profile picker must keep working after Phase 2, and the old page must keep working until T017.
