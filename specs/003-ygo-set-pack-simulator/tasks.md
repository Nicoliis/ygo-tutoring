---

description: "Task list template for feature implementation"
---

# Tasks: YGO Set Pack Simulator

**Input**: Design documents from `/specs/003-ygo-set-pack-simulator/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not included — the project has no automated test suite (see plan.md Technical
Context) and the spec did not request a TDD approach. `quickstart.md` provides the manual
validation scenarios used instead, run in the Polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature **modifies existing files** rather than creating a new page (per plan.md's
Structure Decision — it's the same `Pull`-producing action via a different input, not a new
workflow):

- `tracker.js` — gets set/card-pool fetching+caching, the weighted-draw logic, and the new UI
  wiring (most of this feature's work)
- `tracker.html` — gets the set-picker section markup and the per-tracker simulate-pull control
- `tracker.css` — gets styles for both

No other existing file (`collection.html`/`.js`/`.css`, `index.html`, `app.js`, `style.css`) is
touched by this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the empty scaffolding (constants, cache variables, empty markup) that later
phases fill in — no user-visible behavior yet.

- [X] T001 In `tracker.js`, add an `API_URL` base constant pointing to the same host `app.js`
  already uses (`https://db.ygoprodeck.com/api/v7/`), plus the two endpoint paths this feature
  needs (`cardsets.php`, `cardinfo.php`); declare the session-only cache variables
  `allSetsCache` (initially `null`), `setCardPoolCache` (a `Map`), `selectedSetName` (initially
  `null`), and the loading flags `isFetchingSets` / `isFetchingSetPool` (initially `false`) per
  data-model.md's "Session-only state" table
- [X] T002 [P] In `tracker.html`, add an empty, collapsed-by-default set-picker section (a
  toggle button, a search input placeholder, and an empty results-list container) above the
  trackers list, per plan.md's Structure Decision (page-level, not per-tracker)
- [X] T003 [P] In `tracker.css`, add base layout styles for the set-picker section (collapse
  behavior consistent with the existing `.checklist-section.collapsed` pattern) and a placeholder
  style for the "selected set" badge

**Checkpoint**: The page still loads and behaves exactly as before; the new section exists but is
empty/inert.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The fetch/cache/weighting logic both user stories depend on — nothing in Phase 3+
can be demoed without this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `tracker.js`, implement `fetchAllSets()`: on first call, fetch `cardsets.php`, map
  each entry to `{ name, releaseDate }`, and sort **ascending by `releaseDate`, with
  missing/unparseable dates sorted last** (data-model.md Validation rule); cache the result in
  `allSetsCache`; on any later call, return the cached array directly without re-fetching
  (FR-007 applied to the set list itself)
- [X] T005 In `tracker.js`, implement a fixed rarity→weight lookup (data-model.md's table:
  **Common and anything unrecognized/missing = weight 10, Rare = 3, Super Rare = 1.5, everything
  else (Ultra Rare, Secret Rare, Ultimate Rare, Ghost Rare, etc.) = 1**, matched
  case-insensitively) as `getWeightForRarity(rarity)`
- [X] T006 In `tracker.js`, implement `fetchSetCardPool(setName)`: on first call for a given
  `setName`, fetch `cardinfo.php?cardset=<setName>`, and for each returned card find the
  `card_sets` entry whose `set_name` **exactly matches `setName`** (never just the first entry —
  research.md's correctness rule for reprinted cards) to look up its rarity via
  `getWeightForRarity`, building an array of `{ name, weight }`; cache the result in
  `setCardPoolCache` keyed by `setName`; on any later call for the same `setName`, return the
  cached pool directly (FR-007)
- [X] T007 In `tracker.js`, implement shared fetch error handling used by both T004 and T006: on
  a network error, a non-OK response, or an empty/unrecognized result, reset the relevant
  loading flag, show a clear message via the existing `alert`-based pattern (e.g. "Couldn't load
  the set list — check your connection and try again."), and leave `allSetsCache` /
  `setCardPoolCache` **unset for that entry** so the next attempt retries rather than caching a
  failure (data-model.md Validation and Error handling)

**Checkpoint**: Foundation ready — set/card-pool data can be fetched, cached, and weighted
correctly; no UI uses it yet.

---

## Phase 3: User Story 1 - Simulate opening packs from a real card set (Priority: P1) 🎯 MVP

**Goal**: Let the user pick a real card set, specify a pack count, and have a realistic,
rarity-weighted random draw feed the shared Backlog and the chosen tracker's pull history.

**Independent Test**: Pick one real card set (even via a simple, unfiltered chronological list),
enter a pack count, run the simulated pull, and confirm the resulting cards come only from that
set and are correctly reflected in the Backlog and the tracker's progress (quickstart.md
Scenario 1).

### Implementation for User Story 1

- [X] T008 [US1] In `tracker.js`, implement `drawSimulatedPull(setName, packCount)`: reject
  `packCount` unless it is a **positive integer** with a clear message (mirroring the existing
  "enter at least one card name" validation already in `logPull`); otherwise resolve `setName`'s
  weighted pool via `fetchSetCardPool` (awaiting the fetch if not yet cached), then draw
  `packCount × 9` cards **with replacement**, each draw independently weighted by the pool
  entries' `weight` (data-model.md "Simulated Pull" steps 1-2); return the resulting array of
  card names
- [X] T009 [US1] In `tracker.js`, wire a successful `drawSimulatedPull` result into the exact
  same pull-logging path `logPull` already uses internally (join the names, one per line, and
  reuse the existing line-splitting/backlog-merge logic) so the shared Backlog and that tracker's
  `pulls` history update exactly as a manual pull would (FR-005, FR-006) — no special-casing
  needed downstream, since a `Pull` doesn't record how its `cardNames` were produced
- [X] T010 [US1] In `tracker.js`, implement a basic set-picker render: on first expand, call
  `fetchAllSets()` (showing a loading state via `isFetchingSets`), then render the
  already-chronologically-sorted list as clickable rows; clicking one sets `selectedSetName` and
  shows a plain "selected set: {name}" indicator (search/filter and the full badge/change-set UX
  are US2's job — this just needs to work end-to-end)
- [X] T011 [US1] In `tracker.js`, implement the per-tracker "Simulate pull" control: a
  pack-count number input (minimum 1) + a "Simulate pull" button next to the existing manual
  pull-logging textarea; **disabled with a hint when no set is selected yet**; shows a loading
  state (disabled + "Loading…" label) while `isFetchingSetPool` is true for the selected set;
  on click, calls `drawSimulatedPull` then T009's logging path and re-renders on success
- [X] T012 [US1] In `tracker.html`, ensure the set-picker's results-list container (from T002)
  and each tracker's pull-logger area have the structural markup T010/T011 need (container
  elements only — content is rendered by `tracker.js`)
- [X] T013 [US1] In `tracker.css`, style the basic set-picker list rows, the simulate-pull
  control, and its disabled/loading states, consistent with existing button and list styles

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 passes) — this is the MVP.

---

## Phase 4: User Story 2 - Choose sets in chronological order (Priority: P2)

**Goal**: Let the user search/browse the full chronologically-sorted set list (not just click
through an unfiltered one) and see clearly which set is currently selected.

**Independent Test**: Open the set picker, confirm sets appear oldest-first, search by name and
confirm matches preserve chronological order, and confirm a clear "selected set" badge appears
after picking one (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T014 [US2] In `tracker.js`, add a client-side search/filter over `allSetsCache` (substring
  match on `name`, case-insensitive) driven by the picker's search input — **no network call per
  keystroke**, since it filters the already-fetched, already-sorted array in memory (research.md
  "no debounce needed" decision) — preserving chronological order among the filtered results
- [X] T015 [US2] In `tracker.js`, replace T010's plain selected-set indicator with the full
  "selected set" badge (name + release date) that stays visible once a set is picked, plus a
  "change" control that reopens the picker
- [X] T016 [US2] In `tracker.js`, wire the set-picker's collapse/expand toggle with
  `aria-expanded` and a descriptive `aria-label` (e.g. `"${open ? "Hide" : "Show"} set picker"`)
  from the start, matching the plan's explicit accessibility callout — not retrofitted later
- [X] T017 [US2] In `tracker.css`, style the search input, the scrollable results list (internal
  scroll, consistent with this project's established "lists of cards scroll internally, not the
  page" pattern), and the selected-set badge with its "change" control

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart.md Scenario 2 passes).

---

## Phase 5: User Story 3 - Fail safely when the card database is unreachable (Priority: P3)

**Goal**: Guarantee that any fetch failure (set list or a set's card pool) leaves the Backlog and
every tracker untouched, with a clear message and a UI that returns to a usable state.

**Independent Test**: Block network access to the card database, attempt a simulated pull (and a
fresh picker open), confirm a clear error and zero changes to the Backlog/trackers, then restore
access and confirm the action now succeeds normally (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T018 [US3] In `tracker.js`, verify and, if needed, harden the error paths from T007 so they
  are correctly reached from both T010's picker-open fetch and T011's simulate-pull fetch: a
  failure at either stage MUST show the message, reset the relevant loading flag so the UI is not
  left stuck disabled, and MUST NOT touch `selectedSetName`, the shared Backlog, or any tracker
  (FR-008)
- [X] T019 [US3] In `tracker.js`, add a defensive guard in `drawSimulatedPull` / T009's wiring so
  that a failed or incomplete `fetchSetCardPool` call can **never** reach the card-drawing or
  pull-logging step — the whole draw must complete successfully in memory before `logPull`'s
  path is invoked even once (research.md "fetch-before-write" decision; this is what makes
  partial writes structurally impossible rather than merely checked-for)

**Checkpoint**: All three user stories are independently functional (quickstart.md Scenario 3
passes).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T020 Run through every scenario in `quickstart.md` in a browser, including Scenario 3's
  deliberately-blocked-network case, cross-checking `collection.html`'s Backlog and the used
  tracker's progress after each pull, and fix any discrepancies found (no automated test suite —
  per constitution Development Workflow, this manual pass is the completion gate)
- [X] T021 Review the finished feature against Constitution Principles I–III — visible
  loading/error feedback (I), confirming exactly the two cached call shapes from research.md
  with zero redundant or per-keystroke network calls (II), and confirming no regression to any
  existing offline-capable functionality (manual pull logging, tracker CRUD, checklist
  management, `collection.html`, `index.html`) (III) — and address any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational completion.
  - US2 (Phase 4) builds directly on US1's basic picker (Phase 3) — it upgrades the same UI
    rather than building a separate one — so implement in priority order: US1 → US2 → US3.
- **Polish (Phase 6)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (fetch/cache/weighting). No dependency on
  US2/US3 — ships with a working, if unfiltered, set picker.
- **User Story 2 (P2)**: Depends on Foundational and on US1's basic picker existing, since it
  upgrades that same picker with search/filter and the full badge UX rather than replacing it.
- **User Story 3 (P3)**: Depends on Foundational and on both fetch call sites existing (T010,
  T011 from US1); independently testable once built, per quickstart.md Scenario 3.

### Within Each User Story

- Fetch/cache/draw logic before render wiring before markup/styling, since `tracker.html`/
  `tracker.css` tasks in each story reference the containers and classes the `tracker.js` tasks
  establish.

### Parallel Opportunities

- T002 and T003 (different files: `tracker.html`, `tracker.css`) can run in parallel with each
  other and with T001.
- All other tasks modify `tracker.js`, `tracker.html`, or `tracker.css` incrementally on top of
  prior tasks in the same file, so they are executed sequentially within each phase to avoid
  conflicting edits.

---

## Parallel Example: Setup Phase

```bash
# Launch the two independent file-edit tasks together:
Task: "Add the empty set-picker section markup to tracker.html"
Task: "Add base set-picker/badge styles to tracker.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Demo if ready — simulating a pull into the shared backlog alone is already a usable increment

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Add User Story 3 → validate (Scenario 3, including the offline case) → demo
5. Polish phase → full quickstart.md pass + constitution review

---

## Notes

- No `[P]` markers inside `tracker.js`-only task sequences: nearly every task edits the same
  file as the task before it, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2/3 for traceability.
- Every data constraint quoted in a task (e.g. "positive integer", "ascending by releaseDate",
  the rarity→weight table, "exactly matches") comes directly from `data-model.md` or
  `research.md` and must be enforced as written, not reinterpreted.
- Accessible names are **not optional polish** here — write the `aria-label` on each control in
  the same task that creates it (T016), per the lesson from the sibling feature's
  `/speckit-converge` pass.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving to the next.

---

## Phase 7: Convergence

**Purpose**: Remediate gaps found by `/speckit-converge` between the implemented code and
spec.md / plan.md / data-model.md / the constitution.

- [X] T022 HIGH: In `tracker.js`, after a simulated pull successfully completes (in the
  `.btn-simulate-pull` click handler in `renderTrackers()`), show an explicit, brief confirmation
  of how many cards were drawn and from how many packs (e.g. "Drew 18 cards (2 packs) from
  {set name}") — currently the only visible change is the `packsOpened` badge updating, which
  confirms packs but not the card total, so the user cannot directly "tell... and confirm that
  total is consistent with the requested pack count" per FR-009 (partial)
