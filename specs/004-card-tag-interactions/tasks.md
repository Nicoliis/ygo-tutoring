---

description: "Task list template for feature implementation"
---

# Tasks: Card Tag Interactions

**Input**: Design documents from `/specs/004-card-tag-interactions/`

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

This feature **modifies existing files** — no new pages (per plan.md's Structure Decision):

- `collection.html` / `collection.js` / `collection.css` — the bulk of this feature (card tags,
  search-add, drag-and-drop, most removal modals)
- `tracker.html` / `tracker.js` / `tracker.css` — one small, independent addition: the
  checklist-entry removal modal (per spec Assumptions, FR-007)

No other existing file (`index.html`, `app.js`, `style.css`) is touched by this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the empty scaffolding (containers, base styles) later phases fill in — no
user-visible behavior change yet.

- [X] T001 Add an empty modal-root container (e.g. `<div id="modalRoot" hidden></div>`) to
  `collection.html`, for the shared modal helper to render into
- [X] T002 [P] In `collection.css`, add fixed-size card-tag CSS tokens/classes (width, height,
  truncation) and a base modal overlay/dialog skeleton (backdrop + centered panel, initially
  unused)
- [X] T003 [P] Add an empty modal-root container to `tracker.html`, and copy the same base modal
  overlay/dialog skeleton styles into `tracker.css` as an **independent** copy (per plan.md's
  "no shared runtime code between pages" rule — not a reference to `collection.css`)

**Checkpoint**: Both pages still load and behave exactly as before; the new containers exist but
are empty/inert.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data-model and shared-helper work every user story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `collection.js`, implement `extractCardDataFromApiResult(apiCard)`: maps one
  `cardinfo.php` result to `{ apiId, type, imageSmall, imageFull, level, atk, def }` — `level`/
  `atk`/`def` are populated **only** for Monster-type cards and are **absent** for Spell/Trap
  cards (data-model.md OwnedCard extension)
- [X] T005 In `collection.js`, implement `addOrIncrementCardFromSearchResult(apiCard)`: reuses
  the existing case-insensitive name-match merge rule, but when a match is found, **additively**
  fills in any of `apiId`/`type`/`level`/`atk`/`def`/`imageSmall`/`imageFull` that entry doesn't
  already have (data-model.md "Merge rule") — never overwrites fields an entry already has from
  its own earlier lookup; when no match is found, creates a new `OwnedCard` with
  `quantityOwned: 1` and the full extracted field set from T004
- [X] T006 In `collection.js`, implement `showModal({ title, bodyHtml, buttons })`: renders into
  the `#modalRoot` container from T001, traps Tab-cycling focus within the modal, treats Escape
  as dismissing it (equivalent to a Cancel button), and returns focus to whatever element
  triggered it on close — built this way from the start, per Constitution Principle I and this
  project's prior lesson about not retrofitting accessibility later
- [X] T007 [P] In `tracker.js`, implement an independent copy of `showModal({ title, bodyHtml,
  buttons })` with the same behavior as T006, rendering into `tracker.html`'s `#modalRoot` from
  T003 (separate code, not a shared import — plan.md's Structure Decision)

**Checkpoint**: Foundation ready — card data extraction/merging and both pages' modal helpers
exist; no UI uses them yet.

---

## Phase 3: User Story 1 - Browse cards as compact, inspectable tags (Priority: P1) 🎯 MVP

**Goal**: Every card in the backlog, an engine's contents, or a deck's contents renders as a
fixed-size tag with hover/expand/modal viewing; new cards are added via search instead of typing.

**Independent Test**: View a backlog with several cards, confirm each renders as a same-size
tag, hover one to see its full name/key info, click it once to see its image, click it again to
see the full-detail modal, and add a brand-new card via search instead of typing its name
(quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T008 [US1] In `collection.js`, implement `renderCardTag(card, container)`: builds the
  fixed-size tag as a native `<button>` (or an element with `tabindex="0"` plus a `keydown`
  handler treating Enter/Space as a click — never a plain non-interactive `<div>`, per
  Constitution Principle I and this project's two prior instances of this exact mistake), with
  truncated name, a hover overlay showing the full name and key details (for a Monster:
  level/rank + ATK/DEF; for a Spell/Trap: just the type; for a card with no looked-up data: name
  only — data-model.md), a click/Enter/Space handler that sets the **single, page-wide**
  `expandedCardId` to this card's id — collapsing whichever other tag previously held it
  (FR-003) — rendering `imageSmall` or a "no image available" placeholder, and a second
  activation (while already expanded) that calls `showModal` (T006) with the complete-details
  view (`type`/`level`/`atk`/`def` and `imageFull`, or the same placeholder if absent)
- [X] T009 [US1] In `collection.js`, replace the backlog's existing name+quantity "Add" form with
  a search-and-select control: debounced (400ms) fetch to `cardinfo.php?fname=<query>` gated
  behind a 3-character minimum, with `AbortController`-based stale-request cancellation —
  mirroring `app.js`'s existing search exactly (research.md); on fetch failure, a non-OK
  response, or zero results, show a clear message and add nothing (FR-010, built in from the
  start, not deferred); selecting a result calls `addOrIncrementCardFromSearchResult` (T005)
- [X] T010 [US1] In `collection.js`, update `renderBacklog()` to render each card via
  `renderCardTag()` (T008) instead of the current plain-text row, keeping the existing
  quantity-adjust input and Remove button alongside the tag
- [X] T011 [US1] In `collection.js`, update `renderEngines()`'s contents loop to render each
  engine card via `renderCardTag()` instead of a plain `<li>` text line
- [X] T012 [US1] In `collection.js`, update `renderDecks()`'s item list and resolved list to
  render card-type entries via `renderCardTag()`; engine-type entries in the item list stay as
  plain labeled rows, since an engine reference isn't itself a single real card (data-model.md)
- [X] T013 [US1] In `collection.css`, style the card tag (fixed size, name truncation, hover
  overlay, image-expanded state) and the search-and-select control (results list, consistent
  with the existing backlog search-input pattern)

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 passes) — this is the MVP.

---

## Phase 4: User Story 2 - Add cards to engines and decks by dragging (Priority: P2)

**Goal**: Dragging a backlog card tag onto an engine or a deck adds it there, supplementing
(not replacing) the existing form-based add controls.

**Independent Test**: Drag a backlog card tag onto an existing engine and onto an existing deck,
confirm each gains that card exactly as the existing form-based add already does, and confirm
dropping outside a valid target changes nothing (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T014 [US2] In `collection.js`, make `renderCardTag()` (T008) draggable: `draggable="true"`
  plus a `dragstart` handler that stores the card's id (e.g. via `dataTransfer`)
- [X] T015 [US2] In `collection.js`, make engine and deck containers valid drop targets:
  `dragover` (prevent default + add a drop-zone-highlight class), `dragleave` (remove it), and
  `drop` — for a deck, call the existing `addItemToDeck(deckId, { type: 'card', cardId,
  quantity: 1 })`; for an engine, call a **new** `addCardToEngine(engineId, cardId, quantity)`
  helper (this path does not exist today — the only existing engine mutation is `updateEngine`'s
  bulk `cards`-array replace — so this helper must read the engine's current `cards`,
  increment/append the one card, and call `updateEngine` under the hood, paralleling T019's new
  `removeCardFromEngine`) — both paths use **quantity 1** per research.md's one-copy-per-drop
  decision — dropping outside any valid target requires no extra code, since nothing listens for
  it there (FR-005/AC3)
- [X] T016 [US2] In `collection.css`, style the drop-zone-highlight state shown on an engine/deck
  container while a card tag is being dragged over it

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart.md Scenario 2 passes);
the pre-existing form-based add controls remain unchanged and fully functional (FR-006).

---

## Phase 5: User Story 3 - Confirm removals through a modal (Priority: P3)

**Goal**: Every removal this feature touches — old and newly-confirmed alike — shows a custom
modal naming the specific item before anything is removed.

**Independent Test**: Trigger each of the seven removal contexts in data-model.md's table and
confirm a modal (not a browser popup) names the specific item before anything is deleted, and
that cancelling removes nothing (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T017 [US3] In `collection.js`, replace `removeCard()`'s browser `confirm()` with `showModal`
  (T006), preserving the existing cascade-count messaging (engines/decks affected)
- [X] T018 [US3] In `collection.js`, replace `deleteEngine()`'s and `deleteDeck()`'s browser
  `confirm()` calls with `showModal`, preserving their existing cascade-count messaging
- [X] T019 [US3] In `collection.js`, add a remove control to each card tag rendered inside an
  engine's contents (T011) that opens a `showModal` removal confirmation and, on confirm, calls a
  **new** `removeCardFromEngine(engineId, cardId)` function — this removal path does not exist
  today (data-model.md's "Remove one card from inside an engine" row)
- [X] T020 [US3] In `collection.js`, replace the deck item list's existing unconfirmed
  `removeItemFromDeck` call site with a `showModal` removal confirmation gating the same
  underlying removal
- [X] T021 [US3] In `tracker.js`, replace `deleteTracker()`'s browser `confirm()` with its own
  `showModal` (T007); replace the checklist entry's existing unconfirmed `removeChecklistEntry`
  call site with a `showModal` removal confirmation gating the same underlying removal
- [X] T022 [US3] In `collection.css` and `tracker.css`, style the removal-confirmation modal's
  content (item name + image if available, Cancel/Confirm buttons), consistent with the shared
  modal skeleton from Setup

**Checkpoint**: All three user stories are independently functional (quickstart.md Scenario 3
passes).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T023 Run through every scenario in `quickstart.md` in a browser — including Scenario 4's
  deliberately-blocked-network case and Scenario 5's keyboard-only/touch-only case — and fix any
  discrepancies found (no automated test suite — per constitution Development Workflow, this
  manual pass is the completion gate)
- [X] T024 Review the finished feature against Constitution Principles I–III — with specific
  attention to: every modal being focus-trapped and Escape-dismissible (not retrofitted), the one
  new network call shape being debounced/abortable with looked-up data persisted at add-time so
  nothing is ever re-fetched, and zero regression to any existing offline-capable functionality
  (viewing/removing already-added cards, managing engines/decks, dragging) — and address any gaps
  found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational completion.
  - US2 (Phase 4) depends on US1 (Phase 3)'s `renderCardTag()` existing — there's nothing to
    drag until cards are discrete tags (spec US2 "Why this priority").
  - US3 (Phase 5) depends on Foundational's `showModal()` (T006/T007) but not on US1/US2 for its
    core removal contexts; T019 specifically depends on US1's T011 (engine contents rendered as
    tags) since it attaches a remove control to that rendering.
  - Implement in priority order: US1 → US2 → US3.
- **Polish (Phase 6)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (card-data extraction/merge, `showModal`). No
  dependency on US2/US3.
- **User Story 2 (P2)**: Depends on Foundational and on US1's `renderCardTag()` existing.
- **User Story 3 (P3)**: Depends on Foundational (`showModal`); T019 additionally depends on
  US1's T011. Otherwise independently testable, per quickstart.md Scenario 3.

### Within Each User Story

- Data/helper functions before render wiring before markup/styling, since `collection.css`/
  `tracker.css` tasks in each story reference the classes the `.js` tasks establish.

### Parallel Opportunities

- T002 and T003 (different files: `collection.css`, `tracker.html`+`tracker.css`) can run in
  parallel with each other and with T001.
- T007 (`tracker.js`) can run in parallel with T004-T006 (`collection.js`) within Foundational,
  since they're independent files with no shared code.
- All other tasks modify `collection.js`/`.html`/`.css` incrementally on top of prior tasks in
  the same file, so they are executed sequentially within each phase to avoid conflicting edits.

---

## Parallel Example: Foundational Phase

```bash
# Launch the two independent-file tasks together:
Task: "Implement extractCardDataFromApiResult/addOrIncrementCardFromSearchResult/showModal in collection.js"
Task: "Implement showModal in tracker.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Demo if ready — cards as tags with real images/details is already a visible improvement

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Add User Story 3 → validate (Scenario 3) → demo
5. Polish phase → full quickstart.md pass (including offline + keyboard/touch-only) +
   constitution review

---

## Notes

- No `[P]` markers inside same-file task sequences: nearly every task edits a file the task
  before it also touched, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2/3 for traceability.
- Every data constraint quoted in a task (field names, the Monster-only level/atk/def rule, the
  additive-merge rule, the one-copy-per-drop rule) comes directly from `data-model.md` or
  `research.md` and must be enforced as written, not reinterpreted.
- Accessible, keyboard-operable modals are **not optional polish** here — build `showModal` with
  focus-trapping and Escape-to-close in the same task that creates it (T006/T007), per this
  project's repeated lesson on this exact point.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving to the next.


---

## Phase 7: Convergence

- [X] T025 Add the card's image (`imageSmall`/`imageFull`, reusing the existing `.modal-body img`
  style already defined for the card-detail modal) to the removal-confirmation modal body built by
  `removeCard`, `removeCardFromEngine`, and `removeItemFromDeck` (for card-type items) in
  `collection.js`, falling back to the existing "no image available" placeholder when the card has
  no image, per data-model.md's Removal Confirmation section ("a body identifying the specific
  item (name, and its image if available)") (partial)
- [X] T026 Refactor `addCardToEngine` in `collection.js` to read the engine's current `cards`,
  increment/append the dropped card's quantity, and persist the result by calling the existing
  `updateEngine(engineId, { cards })` instead of mutating `engine.cards` and calling
  `saveCollection()` directly, per research.md's "Each drop adds exactly one copy" decision and
  tasks.md T015, both of which specify this helper must call `updateEngine` under the hood
  (contradicts)