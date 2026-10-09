---

description: "Task list template for feature implementation"
---

# Tasks: Progression Series Pack Puller

**Input**: Design documents from `/specs/002-progression-pack-tracker/`

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

Flat, build-free static site (per plan.md Project Structure) — all paths are at the repository
root:

- `tracker.html` — new page markup
- `tracker.js` — new page logic (shared-blob persistence, trackers, pulls, checklist progress)
- `tracker.css` — new page styles
- `collection.html` — existing Draft Collection Manager page (touched only for the Polish-phase
  nav link)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new page's three files before any feature logic is added.

- [X] T001 Create `tracker.html` page skeleton: header with title, a nav link to/from
  `collection.html`, and one section container (`#trackersSection`) with a create-tracker form
  placeholder and a trackers-list container, linking `tracker.css` and `tracker.js`
- [X] T002 [P] Create `tracker.css` with a base panel/layout consistent with the conventions
  already used in `collection.css` (same visual language as the other two pages)
- [X] T003 [P] Create `tracker.js` skeleton: an IIFE with `"use strict"`, a `STORAGE_KEY`
  constant set to the same value `collection.js` uses (`"ygoCollection"`), DOM element lookups
  for the trackers section, and an `init()` function wired to run once the script loads

**Checkpoint**: Three empty, linked files exist; opening `tracker.html` loads without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared-blob persistence, the shared backlog-merge rule, and base Tracker CRUD that
every user story depends on (per data-model.md).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `tracker.js`, implement `loadCollection()` / `saveCollection()` reading and writing
  the **same** `localStorage` key `collection.js` uses, defaulting any of `cards`, `engines`,
  `decks`, or `trackers` to `[]` only when that key is genuinely absent from the stored JSON —
  **never** overwrite an existing `engines` or `decks` array with an empty default when saving
  (data-model.md "Top-level persisted shape (extended)")
- [X] T005 In `tracker.js`, implement `nextId(prefix)` as a unique ID generator for trackers and
  pulls (same role as `nextId()` in `collection.js`)
- [X] T006 In `tracker.js`, implement `addOrIncrementCard(name, quantity)` against the shared
  `cards` array: `name` **required, non-empty after trim**; case-insensitive match against an
  existing `OwnedCard` increments its `quantityOwned`; otherwise create a new entry with
  `quantityOwned: 1` — this MUST produce byte-identical results to `collection.js`'s own merge
  rule, since both pages read and write the same array (data-model.md "Interaction with the
  shared Backlog")
- [X] T007 In `tracker.js`, implement Tracker CRUD: `createTracker(name)` — `name` **required,
  non-empty after trim**; `updateTracker(trackerId, { name })` with the same name rule; and
  `deleteTracker(trackerId)` — removes only that tracker's entry from `trackers`, and MUST NOT
  modify `cards`, `engines`, or `decks` in any way (data-model.md Tracker Deletion rule, FR-009)
- [X] T008 In `tracker.js`, wire `init()` to call `loadCollection()` then stub `renderTrackers()`
  so the page renders (even with zero trackers) before any user-story UI exists

**Checkpoint**: Foundation ready — `tracker.js` can load/save the shared blob without corrupting
it, manage Trackers, and merge card names into the shared backlog exactly like `collection.js`.

---

## Phase 3: User Story 1 - Log a pack pull straight into the backlog (Priority: P1) 🎯 MVP

**Goal**: Let the user create a tracker and log a pack's worth of pulled cards in one action,
immediately reflected in the shared Backlog.

**Independent Test**: Create a tracker, log a pull with two card names (one repeated), and
confirm both the tracker's packs-opened count and the Backlog's owned quantities (checked via
`collection.html`) update correctly (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T009 [US1] In `tracker.js`, implement `logPull(trackerId, rawText)`: split `rawText` into
  lines, trim each, drop blank lines, and **reject the pull if zero non-blank lines remain**
  (can't log an empty pack); for each remaining line call `addOrIncrementCard(line, 1)`, then
  push `{ id, cardNames }` (the non-blank, trimmed lines) onto that tracker's `pulls` (data-model.md
  Tracker `pulls` field and Validation rule)
- [X] T010 [US1] In `tracker.js`, implement `renderTrackers()` to list every tracker showing its
  name and `packsOpened` (`pulls.length`)
- [X] T011 [US1] In `tracker.js`, implement the create-tracker form handler (name input) calling
  `createTracker()` and re-rendering on submit
- [X] T012 [US1] In `tracker.js`, implement the per-tracker pull-logging control: a textarea
  (one card name per line) plus a "Log pull" button calling `logPull()` and re-rendering; this
  control is **always visible** per tracker (not hidden behind a toggle), since it's the
  feature's primary, most frequent action — matching the Backlog add-card form's precedent in
  `collection.js` rather than the Engine-creation form's collapsed-by-default precedent
- [X] T013 [US1] In `tracker.html`, add the trackers section markup inside `#trackersSection`:
  create-tracker form (name input + submit) and the list container `renderTrackers()` targets
- [X] T014 [US1] In `tracker.css`, style the trackers list, the pull-logging textarea/button, and
  the empty-state ("no trackers yet") message

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 passes) — this is the MVP.

---

## Phase 4: User Story 2 - Track completion progress against the box's checklist (Priority: P2)

**Goal**: Let the user optionally define a tracker's checklist and see, at a glance, how much of
it has been collected and which cards remain outstanding.

**Independent Test**: Add a 3-entry checklist to a tracker, log a pull matching one entry, and
confirm the completion fraction and outstanding-cards list are both correct and update live; a
tracker with no checklist still shows normally with no broken completion display (quickstart.md
Scenario 2).

### Implementation for User Story 2

- [X] T015 [US2] In `tracker.js`, implement `addChecklistEntry(trackerId, name)` — `name`
  **required, non-empty after trim**; silently no-ops if that name (case-insensitive) is already
  present in the tracker's `checklist` — and `removeChecklistEntry(trackerId, name)`
  (data-model.md Validation)
- [X] T016 [US2] In `tracker.js`, implement `computeTrackerProgress(trackerId)` returning
  `{ packsOpened, checklistTotal, checklistCollectedCount, outstandingChecklist }`: collect the
  set of every distinct (case-insensitive) name across all of the tracker's `pulls[].cardNames`,
  then derive `checklistCollectedCount` and `outstandingChecklist` by matching that set against
  `checklist` — computed fresh on every call, never cached (data-model.md Derived fields; this
  is what makes editing a checklist after pulls already exist resolve correctly with no extra
  code, per the spec's checklist-editing edge case)
- [X] T017 [US2] In `tracker.js`, update `renderTrackers()`: when a tracker's `checklist` is
  non-empty, show a completion badge (`"{checklistCollectedCount} of {checklistTotal}"`) and the
  `outstandingChecklist` list, inside a section **collapsed by default** behind a toggle button
  (mirroring `collection.js`'s Engine/Deck collapse-by-default pattern for secondary content —
  see plan.md's explicit note about getting `aria-label`s right from the start this time); when
  `checklist` is empty, show neither the badge nor the toggle (spec Acceptance Scenario 2.3 —
  no broken or misleading completion fraction)
- [X] T018 [US2] In `tracker.js`, implement the checklist editor UI (shown inside the collapsible
  section from T017): a text input + "Add" button calling `addChecklistEntry()`, and a remove
  button per existing entry calling `removeChecklistEntry()` — the collapse toggle button and
  every remove button MUST carry a descriptive `aria-label` (not just an icon/glyph), per
  Constitution Principle I and plan.md's Constitution Check callout
- [X] T019 [US2] In `tracker.html`/`tracker.js`, ensure the checklist editor and outstanding-list
  markup is generated per tracker by `renderTrackers()` (no static HTML needed beyond the
  container already added in T013)
- [X] T020 [US2] In `tracker.css`, style the collapsed/expanded checklist section, the completion
  badge, the checklist editor, and the outstanding-cards list

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart.md Scenario 2 passes).

---

## Phase 5: User Story 3 - Manage multiple independent trackers (Priority: P3)

**Goal**: Let the user create, rename, and delete multiple trackers without any one tracker's
changes affecting another, and without deleting a tracker ever retracting backlog quantities.

**Independent Test**: Create two trackers, log different pulls against each, rename one and
delete the other (confirming the prompt), and verify the renamed tracker's own data is intact,
the deleted tracker's contributed backlog quantities remain in `collection.html`, and nothing
about the surviving tracker changed (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T021 [US3] In `tracker.js`, implement the rename-tracker UI: an editable name field per
  tracker (in `renderTrackers()`) calling `updateTracker()` on change
- [X] T022 [US3] In `tracker.js`, implement the delete-tracker UI: a delete button per tracker
  that calls `confirm(...)` (naming the tracker) before calling `deleteTracker()` (Constitution
  Principle I — confirm destructive actions), with a descriptive `aria-label` identifying which
  tracker it deletes
- [X] T023 [US3] In `tracker.js`, ensure rename/delete controls render as part of each tracker's
  row in `renderTrackers()` (no additional static markup needed beyond T013's container)
- [X] T024 [US3] In `tracker.css`, style the rename input and delete control consistently with
  the rest of the tracker row

**Checkpoint**: All three user stories are independently functional (quickstart.md Scenario 3
passes).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T025 Add a reciprocal nav link between `collection.html` and `tracker.html` (plan.md
  Structure Decision — mirrors the existing `index.html` ↔ `collection.html` cross-link)
- [X] T026 Run through every scenario in `quickstart.md` in a browser, cross-checking
  `collection.html`'s Backlog after each pull, and fix any discrepancies found (no automated
  test suite — per constitution Development Workflow, this manual pass is the completion gate)
- [X] T027 Review the finished feature against Constitution Principles I–III — with specific
  attention to `aria-label` coverage on every icon-only or ambiguous control (the sibling Draft
  Collection Manager feature shipped two accessible-name regressions that were only caught later
  by `/speckit-converge`; verify none were repeated here), zero new API calls (II), and file
  organization/simplicity (III) — and address any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational completion.
  - US2 (Phase 4) depends on US1 (Phase 3) existing — there is nothing to compute completion
    progress from until pulls can be logged — so implement in priority order: US1 → US2 → US3.
- **Polish (Phase 6)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (shared-blob persistence, merge rule,
  Tracker CRUD). No dependency on US2/US3.
- **User Story 2 (P2)**: Depends on Foundational and on US1's `logPull`/`pulls` existing, since
  completion progress is derived entirely from pull history.
- **User Story 3 (P3)**: Depends on Foundational; independently testable once built, per
  quickstart.md Scenario 3 (does not require US2's checklist to exist, though it coexists with
  it in the same tracker row).

### Within Each User Story

- Data/CRUD functions before render functions before form-handler wiring before markup/styling,
  since `tracker.html`/`tracker.css` tasks in each story reference the containers and classes
  the `tracker.js` tasks establish.

### Parallel Opportunities

- T002 and T003 (different files: `tracker.css`, `tracker.js`) can run in parallel with each
  other and with T001.
- All other tasks modify `tracker.js`, `tracker.html`, or `tracker.css` incrementally on top of
  prior tasks in the same file, so they are executed sequentially within each phase to avoid
  conflicting edits.

---

## Parallel Example: Setup Phase

```bash
# Launch the two independent file-creation tasks together:
Task: "Create tracker.css with a base panel/layout"
Task: "Create tracker.js skeleton with STORAGE_KEY constant and init()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Demo if ready — logging pulls into the shared backlog alone is already a usable increment

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Add User Story 3 → validate (Scenario 3) → demo
5. Polish phase → full quickstart.md pass + constitution review (accessible-name audit first)

---

## Notes

- No `[P]` markers inside `tracker.js`-only task sequences: nearly every task edits the same
  file as the task before it, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2/3 for traceability.
- Every data constraint quoted in a task (e.g. "non-empty after trim", "case-insensitive") comes
  directly from `data-model.md` or `spec.md` and must be enforced as written, not reinterpreted.
- Accessible names are **not optional polish** here — write the `aria-label` on each control in
  the same task that creates it, per plan.md's Constitution Check callout.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving to the next.

---

## Phase 7: Convergence

**Purpose**: Remediate gaps found by `/speckit-converge` between the implemented code and
spec.md / plan.md / data-model.md / the constitution.

- [X] T028 HIGH: In `tracker.js`'s `renderTrackers()`, visually distinguish already-collected
  checklist entries from outstanding ones within the checklist view itself — e.g. mark each
  entry in `.checklist-entries` (not just `.outstanding-list`) with a "collected" indicator when
  its name is in the pull-derived collected set (the same set `computeTrackerProgress` already
  computes) — so a user can see, in one glance, which checklist cards are already obtained and
  which aren't, rather than inferring "obtained" only by elimination against the separate
  Outstanding list and the completion-count badge, per US2/AC2 (partial)
