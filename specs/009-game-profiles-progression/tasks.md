# Tasks: Game Profiles & Progression Mode

**Input**: Design documents from `/specs/009-game-profiles-progression/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/profiles-and-run-contract.md, quickstart.md

**Tests**: Not requested as TDD. One small pure-logic contract test (`shared/profiles.test.js`) is included because profile key resolution and stage rules must never regress (mirrors `shared/save-utils.test.js`). Everything else is validated manually via quickstart.md (constitution: no automated app suite).

**Format**: `- [ ] [ID] [P?] [Story] Description with file path` — [P] = parallelizable (different files, no dependency on incomplete tasks).

**Hard rule for every task**: all persistence goes through `saveData`/`loadData` in `shared/save-utils.js` (no direct `localStorage`), and every new key starts with `ygo`. Do NOT modify `shared/save-utils.js`.

## Phase 1: Setup

- [X] T001 Create folder `progression/` and empty `progression/index.html` skeleton (doctype, `theme.css`, nav css links, same script-tag order as `tracker/index.html` with `../shared/save-utils.js` before `nav-collapse-state.js`)
- [X] T002 [P] Add a "Progression Run" entry to `NAV_ENTRIES` in `shared/nav-entries.js` with `slug: "progression"` (label "Progression Run" to avoid confusion with "Progression Series Pack Puller"); use the same label as the page `<title>`/heading in `progression/index.html` and in the mode selector

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: Profile registry, key resolver and Sandbox migration. Nothing else works without these.

- [X] T003 Create `shared/profiles.js` with `listProfiles`, `getActiveProfile`, `setActiveProfile`, `profileKey(baseKey)` per contracts/profiles-and-run-contract.md. Registry lives in key `ygoProfiles` as `{ activeId, profiles: [] }`; Profile fields: `id` (unique, immutable, `"sandbox"` reserved), `name` (non-empty, unique case-insensitive, trimmed), `mode` (`"progression"` | `"sandbox"`), `createdAt` (ISO, set once). `profileKey` returns `baseKey` unchanged for the sandbox profile and `baseKey + "_" + id` otherwise; it throws if there is no active profile. Use only `saveData`/`loadData`, and spread existing records on update so unknown fields are preserved.
- [X] T004 In `shared/profiles.js` add the one-time Sandbox migration run by `listProfiles` when `ygoProfiles` is absent: if legacy `ygoCollection` or `ygoDeck` exists create `{ id: "sandbox", name: "Sandbox", mode: "sandbox" }`; if none exists create nothing. It MUST NOT write to or delete the legacy keys.
- [X] T005 [P] Create `shared/profiles.test.js` (Node, mocked `localStorage` like `shared/save-utils.test.js`) covering: `profileKey` for sandbox vs other profile, throws with no active profile, migration with/without legacy data and legacy keys left byte-identical, name validation (empty, duplicate case-insensitive), unknown fields preserved, and that exportAll's prefix rule (`ygo`) matches every new key.
- [X] T034 Create `shared/profile-guard.js` (loaded right after `profiles.js` and BEFORE any `*-dom-refs.js`): on tool pages, if `getActiveProfile()` is null, redirect to root `index.html` (`../index.html` from tool folders) and stop script execution for that page (e.g. by throwing after `location.replace`); no-op on root `index.html`. This must exist before T006 so tools never throw on `profileKey` without an active profile.
- [X] T006 Change `STORAGE_KEY` to `profileKey("ygoCollection")` in `collection/collection-dom-refs.js`, `draft/draft-dom-refs.js`, `tracker/tracker-dom-refs.js`, and to `profileKey("ygoDeck")` in `proxy-builder/proxy-dom-refs.js`
- [X] T007 Add `<script src="../shared/profiles.js">` then `<script src="../shared/profile-guard.js">` immediately after `save-utils.js` and before the `*-dom-refs.js` script in `collection/index.html`, `draft/index.html`, `tracker/index.html`, `proxy-builder/index.html`; in root `index.html` add only `profiles.js` (no guard). Required order: save-utils → profiles → profile-guard → dom-refs.

**Checkpoint**: Existing tools still work against the Sandbox profile data (manually set `ygoProfiles` active = sandbox to verify).

---

## Phase 3: User Story 1 - Choose or create a profile on entry (Priority: P1) 🎯 MVP

**Goal**: Entry shows a profile picker; every tool shows only the active profile's data.

**Independent Test**: quickstart.md Scenario 2 (two profiles are isolated).

- [X] T008 [US1] Create `shared/profile-switcher.js`: render the current profile name and a "Switch profile" link (to root `index.html`) into the sidebar (reuse structure of `shared/nav-sidebar.js`, with accessible labels). The redirect itself lives in `profile-guard.js` (T034). Add its script tag after `nav-sidebar.js` in the four tool `index.html` files and `progression/index.html`.
- [X] T009 [US1] Rebuild root `index.html` content as the profile picker plus existing tool grid: list profiles (name, mode, short progress summary placeholder), a create form (name + mode select with "Progression" only), select/rename/delete actions. Styles in `welcome.css`.
- [X] T010 [US1] Create `shared/profile-picker.js` wiring the picker UI to `createProfile`, `renameProfile`, `deleteProfile`, `setActiveProfile`; show validation messages for empty/duplicate names; deletion goes through the existing confirm dialog (`shared/modal.js`) and returns to the picker when the active profile is deleted.
- [X] T011 [US1] Add `createProfile`, `renameProfile`, `deleteProfile` to `shared/profiles.js` per the contract; `deleteProfile` removes only that profile's `ygo*_<id>` keys (legacy keys only if Sandbox deletion was confirmed)
- [X] T012 [US1] Make picker last-used profile preselected on load (FR-005) using `activeId`
- [X] T039 [US1] Show a clear message when browser storage cannot be written (e.g. `saveData` returns false) when creating, renaming, deleting or switching profiles (edge case "storage full or unavailable") in `shared/profile-picker.js`

**Checkpoint**: User Story 1 fully functional and testable on its own.

---

## Phase 4: User Story 2 - Start a Progression run and open the first box (Priority: P1)

**Goal**: A Progression profile starts empty at the first booster; one box (24 packs) can be opened once.

**Independent Test**: quickstart.md Scenario 3 steps 1–3 and Scenario 4.

- [X] T013 [P] [US2] Create `progression/progression-state.js` with `loadRun`, `saveRun`, `newRun(boosterList)`, `canOpenBox`, `canCompleteStage`, `openBoxApplied` using key `ygoRun_<profileId>`. Run fields: `completed` (string[] booster names), `current` (string | null), `boxOpened` (boolean), `startedAt` (ISO), `finishedAt` (ISO | null). Stage identity is by booster name, never index. Blocked actions return a reason string.
- [X] T035 [US2] Make the draft's pack-generation pieces reusable outside the draft page: move `fetchSetCardPool` (+ `setCardPoolCache`, `SET_CARDS_URL`, `getWeightForRarity`, `parsePrice`, `extractCardFields`), the weighted pick, `getBoosterSize`/`BOOSTER_SIZE_OVERRIDES`/`DEFAULT_BOOSTER_SIZE` and `nextId` (wherever each is defined today) into `shared/` files with no DOM/UI calls; replace the `showConfigStatus` call in `fetchSetCardPool` with a thrown error that `draft/` catches and displays itself. Update `draft/index.html` script tags so draft behavior is identical. Do this before T014.
- [X] T036 [US2] Create `progression/progression-dom-refs.js` defining `STORAGE_KEY = profileKey("ygoCollection")` and the page's DOM element refs, loaded in `progression/index.html` after `profile-guard.js`
- [X] T014 [P] [US2] Create `progression/progression-box.js` with `openBox(setName)`: 24 packs × `getBoosterSize(setName)`, pool via the shared `fetchSetCardPool` and weighted pick from T035; rejects without side effects on fetch failure
- [X] T015 [US2] Extract the backlog merge from `draft/draft-backlog-merge.js` into a shared function usable by progression (e.g. `shared/backlog-merge.js` exposing `mergeCardsIntoBacklog(cards)` using `loadData`/`saveData` on `profileKey("ygoCollection")`), keep draft behavior identical and update draft to call it
- [X] T016 [US2] Create `progression/progression-render.js` and `progression/progression-init.js`: when the active profile mode is progression and no run exists create `newRun(MAINLINE_BOOSTERS)`; show current stage, an "Open box" button with confirm dialog, status/blocked messages; loads `draft/mainline-boosters.js` via `../draft/mainline-boosters.js`. If the active profile's mode is not `progression` (e.g. Sandbox) show "This profile has no run rules" with links to the other tools and render nothing else (FR-013a).
- [X] T017 [US2] Wire "Open box": call `openBox`, merge cards into backlog, and only after the backlog is saved call `openBoxApplied` + `saveRun`; show error and leave `boxOpened` false on failure (edge case offline); show a block message when already opened (FR-009)
- [X] T018 [US2] Keep opening any other set freely via the existing Booster Draft tool for progression profiles (FR-009a); confirm no restriction was added to `draft/`

**Checkpoint**: A new Progression profile has an empty backlog; its first box lands in the backlog exactly once.

---

## Phase 5: User Story 3 - Deckbuild, duel, advance (Priority: P1)

**Goal**: After opening the box the user completes the stage and the run moves to the next booster.

**Independent Test**: quickstart.md Scenario 3 steps 4–6.

- [X] T019 [US3] Add `completeStage(run, boosterList)` to `progression/progression-state.js`: allowed only if `boxOpened`; appends `current` to `completed`, sets `current` to the first list entry after it (null when none and sets `finishedAt`), resets `boxOpened` false; never mutates completed history
- [X] T020 [US3] Add "Complete stage" button with confirm dialog in `progression/progression-render.js`; blocked with explanation when the box is not opened (SC-005); no undo UI anywhere (FR-009b)
- [X] T021 [US3] Render the finished-run state when `current` is null (FR-014) and link to Collection for deckbuilding from the stage screen (FR-010)
- [X] T022 [US3] Verify backlog and decks are unchanged by advancing (FR-012); no code touches `ygoCollection_<id>` in `completeStage`

---

## Phase 6: User Story 4 - Run progress and history (Priority: P2)

**Goal**: Overview of completed / current / remaining stages with release dates and card totals.

**Independent Test**: quickstart.md Scenario 3 step 5–6 (after two stages).

- [X] T023 [P] [US4] Create `progression/progression-boosters.js`: one `cardsets.php` fetch (URL constant alongside existing API URLs in `shared/card-api.js`) cached in memory and via `saveData` under key `ygoSetDates`; `getReleaseDate(name)` returns a string or null; failures are silent (dates are display-only, never affect order)
- [X] T024 [US4] In `progression/progression-render.js` render the three lists (completed, current, remaining) in `MAINLINE_BOOSTERS` order with release dates when known, plus total cards owned from the profile backlog
- [X] T025 [US4] Show a per-profile one-line summary on picker cards in root `index.html` via `shared/profile-picker.js`, exactly "Stage 12/140 – Box opened" / "Stage 12/140 – Box not opened" / "Finished" for progression profiles and the mode name for Sandbox; resume at same stage after reload (SC-002)
- [X] T026 [US4] Handle the booster list gaining a new entry: an in-progress run lists it among remaining stages in list position with completed history untouched; a finished run (`current === null`) stays finished (clarified)

---

## Phase 7: User Story 5 - Keep existing data, allow future modes (Priority: P3)

**Goal**: Legacy data is reachable in "Sandbox"; mode is data, so adding modes later is cheap.

**Independent Test**: quickstart.md Scenario 1 and Scenario 5.

- [X] T027 [US5] Verify the Sandbox profile appears in the picker with the existing cards/decks/proxy deck and that opening it never writes to a `_sandbox`-suffixed key (add a case to `shared/profiles.test.js`)
- [X] T028 [US5] Define a small `GAME_MODES` constant in `shared/profiles.js` (`progression` selectable at creation; `sandbox` only created by migration) and have `profile-picker.js` build the mode select from it (FR-017)
- [X] T029 [US5] Extend the export/import check: confirm `exportAll()` contains `ygoProfiles`, per-profile collection keys and `ygoRun_<id>`, and `importAll` restores them (add case to `shared/save-utils.test.js`; no change to `save-utils.js`)

---

## Phase 8: Polish & Cross-Cutting

- [X] T030 [P] Keyboard operability and accessible names for picker, switcher, confirm dialogs and stage buttons (Constitution I)
- [X] T031 [P] Update `README`/notes if present and the booster-list comment in `draft/mainline-boosters.js` to state that order = progression order
- [ ] T032 Run through every scenario in `specs/009-game-profiles-progression/quickstart.md` in a browser and fix issues
- [X] T038 [P] Create `shared/tests.html`: a browser page that loads `save-utils.js`, `profiles.js` and runs the same assertions as `save-utils.test.js` / `profiles.test.js` against a mocked storage object, printing PASS/FAIL per case (Node is not installed on the dev machine). Share assertion code between the Node and browser runners where practical.
- [X] T033 Run the contract tests (`shared/tests.html` in a browser, or `node shared/save-utils.test.js` and `node shared/profiles.test.js` if Node is available) and confirm no direct `localStorage` use outside `shared/save-utils.js` with a grep

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → user stories.
- US1 (Phase 3) is the MVP and blocks US2–US5 because they need an active profile.
- US2 → US3 (advancing needs an opened box) → US4 (progress view needs completed stages).
- US5 depends only on Phase 2 migration and can run in parallel with US2–US4 after US1.
- Within phases: T003 → T004; T034 after T003; T006/T007 after T034; T035 before T014 and T015; T036 before T016; T015 before T017; T013 and T014 are independent.
- Task IDs T034–T039 were added after analysis; they are placed in the phase where they run, so IDs are not strictly sequential in file order.

## Parallel Opportunities

- T002 with T001; T005 with T006/T007 (different files); T038 with other polish tasks.
- T013 and T014 and T023 touch different files and can be built concurrently.
- T030 and T031 are independent polish tasks.

## Implementation Strategy

1. **MVP**: Phases 1–3 (profiles with isolation + Sandbox migration). Stop and validate quickstart Scenarios 1–2.
2. Add US2 + US3 for the playable Progression loop; validate Scenarios 3–4.
3. Add US4 (progress view), then US5 verification and Polish.
