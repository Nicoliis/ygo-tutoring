---

description: "Task list template for feature implementation"
---

# Tasks: Booster Pull Review

**Input**: Design documents from `/specs/005-booster-pull-review/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not included — the project has no automated test suite (see plan.md Technical
Context) and the spec did not request a TDD approach. `quickstart.md` provides the manual
validation scenarios used instead, run in the Polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and
testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

This feature **modifies existing files** — no new pages (per plan.md's Structure Decision):

- `tracker.html` / `tracker.js` / `tracker.css` — all of this feature's work
- No other existing file (`index.html`, `app.js`, `style.css`, `collection.html`/`.js`/`.css`) is
  touched by this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add empty/unused scaffolding later phases fill in — no user-visible behavior change
yet.

- [X] T001 [P] In `tracker.css`, add CSS scaffolding for `.pending-pull-review`, `.minicard-list`,
  `.minicard` (a small, fixed-size tile), and `.pending-pull-actions` (a button row) — structure
  only, unused until wired by later tasks
- [X] T002 [P] In `tracker.css`, add a `.modal-dialog .modal-body img` rule (mirroring
  `collection.css`'s existing rule for its own modal) — `tracker.js`'s `showModal` has never shown
  an image before this feature

**Checkpoint**: `tracker.html` still loads and behaves exactly as before; the new styles are
unused.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data and session-state work every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 In `tracker.js`, extend `fetchSetCardPool`'s mapped pool entries from `{ name, weight }`
  to also capture `apiId`/`type`/`level`/`atk`/`def`/`imageSmall`/`imageFull` from the same,
  already-fetched `cardinfo.php?cardset=` response — `level`/`atk`/`def` populated **only** for
  Monster-type cards, mirroring `collection.js`'s `extractCardDataFromApiResult` rule exactly
  (data-model.md's extended pool entry) — this introduces **zero** new network calls
  (research.md)
- [X] T004 In `tracker.js`, change `weightedRandomPick(pool)` to return the chosen pool entry
  object itself (not just its `name` string), so a drawn pack becomes an array of rich card
  objects instead of bare strings
- [X] T005 In `tracker.js`, add the session-only `pendingPulls` Map (tracker id →
  `{ setName, packCount, packs }`), mirroring the existing `setCardPoolCache`/`expandedTrackers`
  session-state pattern already used in this file (data-model.md's Pending Pull) — never written
  to `localStorage`

**Checkpoint**: Foundation ready — the pool carries full card detail and there's a place to hold a
pending draw; no UI uses either yet.

---

## Phase 3: User Story 1 - Review a simulated pull before committing it (Priority: P1) 🎯 MVP

**Goal**: Simulating a pull no longer immediately touches the backlog or tracker progress —
instead it's held as a pending review the user explicitly Saves, Reattempts, or Discards.

**Independent Test**: Simulate a pull, confirm nothing is added to the backlog or to the "pack(s)
opened" count yet, then confirm Save commits it, Discard clears it with no effect, and Reattempt
replaces it with a fresh draw using the same set and pack count (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T006 [US1] In `tracker.js`, implement `renderMinicard(card)`: a native `<button>` (not a
  plain `<div>`, per Constitution Principle I and this project's repeated lesson on this exact
  mistake) showing the card's name — click behavior is added by User Story 2 (T015); for now it
  renders inert
- [X] T007 [US1] In `tracker.js`, rework the "Simulate pull" button's click handler: instead of
  calling `drawSimulatedPull` and immediately looping `logPull` per pack, call a new
  `startPendingPull(trackerId, setName, packCount)` that validates the pack count, performs the
  weighted draw (reusing the existing fetch/cache path and `drawSimulatedPull`'s pack-building
  loop), and stores the result into `pendingPulls` (T005) instead of touching the backlog or the
  tracker's `pulls` — the existing fail-safe alerts (invalid pack count, empty pool, fetch
  failure) are unchanged (FR-001)
- [X] T008 [US1] In `tracker.js`, implement `savePendingPull(trackerId)`: for each pack in that
  tracker's pending pull, call the existing `logPull(trackerId, pack.map(c => c.name).join("\n"))`
  **unchanged** — preserving the one-`Pull`-per-pack rule that fixed feature 003's `packsOpened`
  undercounting bug (research.md) — then delete that tracker's entry from `pendingPulls` (FR-004)
- [X] T009 [US1] In `tracker.js`, implement `discardPendingPull(trackerId)`: delete that tracker's
  entry from `pendingPulls` with no other effect (FR-005)
- [X] T010 [US1] In `tracker.js`, implement `reattemptPendingPull(trackerId)`: using the pending
  pull's own stored `setName`/`packCount` (**not** the live, page-wide `selectedSetName`, which may
  have changed since), perform a brand-new weighted draw from the same already-cached pool and
  replace that tracker's `pendingPulls` entry with the new result (FR-006, Edge Case: independent
  of later set-selector changes)
- [X] T011 [US1] In `tracker.html`, add the pending-pull-review markup inside each tracker's card
  (a heading naming the set/pack count, a `.minicard-list` container, and Save/Reattempt/Discard
  buttons); in `tracker.js`'s `renderTrackers()`, render this block only when
  `pendingPulls.has(tracker.id)`, wiring the three buttons to T008/T009/T010 and rendering each
  pulled card — flattened across all packs — via `renderMinicard` (T006)
- [X] T012 [US1] In `tracker.js`'s `renderTrackers()`, disable the "Simulate pull" button for a
  tracker while `pendingPulls.has(tracker.id)` is true (FR-007), re-enabling it once the pending
  pull is resolved by any of Save/Reattempt/Discard
- [X] T013 [US1] In `tracker.css`, finish the pending-pull-review/minicard-list/action-button
  styling scaffolded in Setup (T001) against the real rendered markup from T011

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 and Scenario 3 pass) — this is the MVP.

---

## Phase 4: User Story 2 - Inspect a pulled card's details from its minicard (Priority: P2)

**Goal**: Clicking a pending pull's minicard shows that card's image and key details, without
affecting the pending Save/Reattempt/Discard decision.

**Independent Test**: With a pull pending review, click one of its minicards and confirm a detail
view opens showing its image and (for a Monster) level/ATK/DEF, with no new network request and no
change to the pending review itself (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T014 [US2] In `tracker.js`, implement `openPulledCardDetailModal(card)`: calls the existing
  `showModal` (feature 004) with the card's `imageFull` (or a "no image available" placeholder)
  and every known field (`type`, `level`, `atk`, `def`), or a graceful "no further details
  available" fallback if none of that was captured (FR-009) — mirrors `collection.js`'s
  `openCardDetailModal` pattern, independently implemented per this project's "no shared runtime
  code between pages" rule
- [X] T015 [US2] In `tracker.js`, add a click handler to `renderMinicard` (T006) that calls
  `openPulledCardDetailModal` (T014) — a single click opens the modal directly; **not** the
  hover/expand/second-click progression used for backlog/engine/deck cards in the Card Tag
  Interactions feature (research.md, spec Assumptions), consistent with FR-008

**Checkpoint**: Both user stories are independently functional (quickstart.md Scenario 2 passes).

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T016 Run through every scenario in `quickstart.md` in a browser — including the
  independence-from-the-global-set-selector scenario (Scenario 3) and the keyboard-only scenario
  (Scenario 4) — and fix any discrepancies found (no automated test suite — per constitution
  Development Workflow, this manual pass is the completion gate)
- [X] T017 Review the finished feature against Constitution Principles I-III — with specific
  attention to: confirming via DevTools that Reattempt and a minicard's detail click produce
  **zero** new network requests, every new control (minicards, Save/Reattempt/Discard) being
  reachable and operable via keyboard alone, and no regression to the existing manual "Log pull"
  flow or to `packsOpened` accuracy — and address any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-4)**: Both depend on Foundational completion.
  - US2 (Phase 4) depends on US1 (Phase 3)'s `renderMinicard()` existing — there's nothing to
    attach a click handler to until minicards are rendered at all.
  - Implement in priority order: US1 → US2.
- **Polish (Phase 5)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (pool extraction, `pendingPulls` state). No
  dependency on US2.
- **User Story 2 (P2)**: Depends on Foundational and on US1's `renderMinicard()` existing.

### Within Each User Story

- Data/state functions before render wiring before styling, since `tracker.css` tasks in each
  story reference the classes/markup the `.js`/`.html` tasks establish.

### Parallel Opportunities

- T001 and T002 (both in `tracker.css`, but non-overlapping rule blocks) may be done together or
  sequentially — no functional dependency between them.
- All other tasks modify `tracker.js`/`.html`/`.css` incrementally on top of prior tasks in the
  same file, so they are executed sequentially within each phase to avoid conflicting edits.

---

## Parallel Example: Setup Phase

```bash
# Both Setup tasks touch tracker.css but different, non-overlapping rule blocks:
Task: "Add pending-pull-review/minicard-list/minicard/pending-pull-actions CSS scaffolding"
Task: "Add a .modal-dialog .modal-body img rule"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 (and Scenario 3) independently
5. Demo if ready — review-before-commit with plain-name minicards is already a complete,
   demonstrable improvement over today's immediate-commit behavior

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1, 3) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Polish phase → full quickstart.md pass (including keyboard-only) + constitution review

---

## Notes

- No `[P]` markers inside same-file task sequences beyond T001/T002: nearly every task edits a
  file the task before it also touched, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2 for traceability.
- Every data constraint quoted in a task (the Monster-only level/atk/def rule, the
  one-`Pull`-per-pack rule, the zero-new-network-calls rule) comes directly from `data-model.md`
  or `research.md` and must be enforced as written, not reinterpreted.
- Keyboard-operable minicards and action buttons are **not optional polish** here — build
  `renderMinicard` as a real `<button>` from the task that creates it (T006), per this project's
  repeated lesson on this exact point.
- Commit after each task or logical group; stop at either checkpoint to validate a story
  independently before moving to the next.


---

## Phase 6: Convergence

- [X] T018 In `tracker.js`'s `deleteTracker` confirm handler, add `pendingPulls.delete(trackerId)`
  alongside the existing `collection.trackers` filter and `expandedTrackers.delete(trackerId)`, so
  a pending pull is actually removed (not merely left unreachable) when its tracker is deleted, per
  spec.md's Edge Case: "What happens if the user deletes a tracker that has a pending, unsaved
  pull? The pending pull is simply discarded along with it" (partial)