---

description: "Task list template for feature implementation"
---

# Tasks: Collection Bags & Deck Export

**Input**: Design documents from `/specs/006-collection-bags-export/`

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

- `collection.html` / `collection.js` / `collection.css` — all of this feature's work
- No other existing file (`index.html`, `app.js`, `style.css`, `tracker.html`/`.js`/`.css`) is
  touched by this feature.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add CSS scaffolding later phases wire real markup into — no user-visible behavior
change yet.

- [X] T001 In `collection.css`, add scaffolding for: a shared bag header/body pattern (collapsed =
  name only; expanded = contents + bin) usable by both `.engine-card` and `.deck-card`, a bin
  drop-zone style, a Main Deck/Extra Deck two-column section layout, and import/export modal
  content styles — structure only, unused until later tasks wire real markup into it

**Checkpoint**: `collection.html` still loads and behaves exactly as before; the new styles are
unused.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The data-layer primitives every story's UI code depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 In `collection.js`, extend `extractCardDataFromApiResult(apiCard)` to also return
  `effect: apiCard.desc || null` (data-model.md's `OwnedCard.effect`) — used identically by the
  existing search-and-select add flow and by this feature's new backfill lookup (T006)
- [X] T003 In `collection.js`, add a session-only `lookupAttempted` Set and a
  `maybeBackfillCardDetails(card)` function: if `!card.apiId && !lookupAttempted.has(card.id)`,
  add the id to `lookupAttempted` **before** fetching (so a failure is never retried this page
  load — FR-003), then call `cardinfo.php?name=<exact card name>` (exact match, distinct from the
  fuzzy `?fname=` the search box uses — research.md), and on a match, additively fill in the same
  fields `extractCardDataFromApiResult` produces, `saveCollection()`, and re-render. Not yet wired
  to any UI trigger.
- [X] T004 In `collection.js`, add a deck migration step inside `loadCollection()`: for each parsed
  deck still shaped as `{items: [...]}` (no `main`/`extra` yet), build `main` by merging every
  old card-type item as-is and every old engine-type item resolved into that engine's *current*
  `cards` (quantity × the old `copies`), set `extra: []`, and delete `items` (data-model.md's
  Migration) — already-migrated decks (no `items` key) pass through unchanged
- [X] T005 In `collection.js`, remove the "≥2 distinct cards" minimum from `validateCardEntries` —
  keep only the per-entry checks (valid `cardId`, positive `quantity`) — so an engine may be
  created or updated with 0, 1, or more cards (data-model.md's simplified Engine, FR-018)

**Checkpoint**: Foundation ready — card data capture includes `effect`, a backfill function exists,
decks carry `main`/`extra`, and engines have no card-count floor; no UI uses any of this yet.

---

## Phase 3: User Story 1 - Every backlog card shows its real details (Priority: P1) 🎯 MVP

**Goal**: Hovering or clicking any backlog card — old or new — triggers a one-time backfill lookup
if it lacks stored details, and the full detail view now includes the card's effect text.

**Independent Test**: View a backlog card added before the search-based add flow existed, confirm
hovering it fetches and displays real data exactly once, and that its full detail view includes
effect text (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T006 [US1] In `collection.js`'s `renderCardTag`, call `maybeBackfillCardDetails(card)` (T003)
  at the top of `showHoverOverlay()` and at the top of the tag's `click` handler, so the lookup
  fires on whichever interaction (hover or click) happens first
- [X] T007 [US1] In `collection.js`'s `openCardDetailModal`, render `card.effect` as an additional
  detail line when present (FR-004), alongside the existing type/level/ATK/DEF fields
- [X] T008 [US1] In `collection.css`, style the effect-text block in the detail modal (e.g.
  `.modal-body .card-effect`) for comfortable paragraph wrapping, distinct from the short
  label/value lines above it

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 passes) — this is the MVP.

---

## Phase 4: User Story 2 - Engines behave as simple, clickable bags (Priority: P2)

**Goal**: An engine collapses to its name, expands on a click anywhere on it, and its composition
is managed purely by dragging (add) and dragging-to-a-bin (remove) — no checkbox picker, Edit is
rename-only.

**Independent Test**: Create an engine (name only, no card picker), expand/collapse it by clicking
anywhere on it, drag a card in, then remove it via the bin and via the non-drag "✕" (quickstart.md
Scenario 2).

### Implementation for User Story 2

- [X] T009 [US2] In `collection.html`, simplify the engine creation form to a name input and a
  submit button only — remove the checkbox-based card picker markup (`engineCardPicker` and its
  container)
- [X] T010 [US2] In `collection.js`, update `createEngine` to accept just a name (no `cardEntries`
  parameter) and create `{id, name, cards: []}` directly; remove `engineDraft`'s
  selection-tracking state and `renderEngineCardPicker()`; update the `engineForm` submit handler
  accordingly (create-only — see T013 for how editing/renaming now works)
- [X] T011 [US2] In `collection.js`'s `renderEngines()`, rework the collapsed state to show only
  the engine's name (plus the always-visible Delete and rename controls — spec Assumptions) and
  remove the old small `.btn-toggle` arrow button; clicking anywhere on the bag's header/body area
  (excluding the header's buttons and, while expanded, the cards/bin inside) toggles
  `expandedEngines` (FR-006/FR-007) — button click handlers call `e.stopPropagation()` so they
  never also trigger the toggle
- [X] T012 [US2] In `collection.js`, make each card rendered inside an expanded engine draggable
  with the `application/x-bag-card-source` payload `{cardId, source: {type: "engine", engineId}}`
  (research.md, in addition to the existing `text/plain` payload used for cross-bag adds); add a
  visible bin drop-zone to the expanded engine body whose `drop` handler reads that payload and
  calls `removeCardFromEngine` — the existing small "✕" remove button on each card remains as the
  non-drag equivalent, and neither path shows a confirmation modal (spec Assumptions)
- [X] T013 [US2] In `collection.js`, replace the engine header's "Edit" button behavior: instead of
  reopening the (now-removed) card-picker form, it lets the user rename the engine only (e.g. an
  inline editable name field or a small `showModal` prompt), calling `updateEngine(engineId,
  {name})` — it MUST NOT offer any bulk card-list replacement (FR-012)
- [X] T014 [US2] In `collection.css`, finish the bag header/body, bin drop-zone, and rename-control
  styling scaffolded in Setup (T001) against the real rendered markup from T011-T013

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart.md Scenario 2 passes).

---

## Phase 5: User Story 3 - Decks as Main/Extra bags with YDK export/import (Priority: P3)

**Goal**: A deck behaves like the same kind of bag as an engine, split into Main Deck and Extra
Deck sections; dropping an engine onto either section resolves it into plain cards immediately;
decks gain Export (YDK + clipboard + file) and Import (YDK, backlog-only matching).

**Independent Test**: Expand a deck, drag cards and an entire engine onto its Main/Extra sections,
remove a card via the bin, export it to valid YDK text, and import that text into a fresh deck with
matching contents (quickstart.md Scenarios 3 and 4).

### Implementation for User Story 3

- [X] T015 [US3] In `collection.html`, rework each deck's markup into two sections (Main Deck,
  Extra Deck), each with its own card-tag-list container and bin drop-zone; update the item-adder
  to include an explicit Main/Extra choice alongside its existing card/engine picker and quantity
  input; add Export and Import controls (Import opens a control with both a file input accepting
  `.ydk` and a textarea for pasting)
- [X] T016 [US3] In `collection.js`, replace `addItemToDeck`/`removeItemFromDeck` with
  `addCardToDeckSection(deckId, section, cardId, quantity)`,
  `addEngineToDeckSection(deckId, section, engineId)` (merges every card currently in that engine
  into the chosen section, per-card quantity — data-model.md), and
  `removeCardFromDeckSection(deckId, section, cardId)` (no confirmation, per spec Assumptions)
- [X] T017 [US3] In `collection.js`'s `renderDecks()`, apply the same collapsed-to-name /
  click-anywhere-to-expand bag behavior as engines (T011); render `deck.main` and `deck.extra` each
  as their own card-tag-list with a bin, replacing the old unified `deck-item-list`/
  `deck-resolved-list` split entirely
- [X] T018 [US3] In `collection.js`, wire each deck section as a drop target for both single-card
  drags (`text/plain` payload → `addCardToDeckSection`) and whole-engine drags (a new
  `application/x-engine-source` payload set by making the engine's bag header itself draggable →
  `addEngineToDeckSection`), make cards inside a deck section draggable with the same
  `application/x-bag-card-source` remove payload as engines (T012) targeting that section's bin,
  and wire the item-adder's non-drag controls (including the Main/Extra choice) to the same
  functions
- [X] T019 [US3] In `collection.js`, implement `buildYdkText(deck)` per data-model.md's format
  (`#main`/`#extra`/`!side`, one `apiId` line per copy, skipping and listing any card with no
  stored `apiId`) and wire it to each deck's Export control — copy to clipboard and offer a
  `.ydk` file download, replacing the prior plain-text export entirely
- [X] T020 [US3] In `collection.js`, implement YDK parsing and `importYdkIntoDeck(deckId, text)`:
  parse `#main`/`#extra` sections into passcode lists, match each passcode against
  `collection.cards` by `apiId` only (FR-016 — no network call), **replace** the target deck's
  `main`/`extra` with the matched results, and report any unmatched passcodes clearly (FR-017);
  wire it to the Import control from T015, handling malformed/empty input with a clear message and
  no changes made
- [X] T021 [US3] In `collection.css`, finish the Main/Extra section layout, bin drop-zones, and
  import/export control styling scaffolded in Setup (T001) against the real rendered markup from
  T015-T020

**Checkpoint**: All three user stories are independently functional (quickstart.md Scenarios 1-4
pass).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T022 Run through every scenario in `quickstart.md` in a browser — including the keyboard-only
  scenario (Scenario 5) and the full YDK export→import round trip (Scenario 4) — and fix any
  discrepancies found (no automated test suite — per constitution Development Workflow, this
  manual pass is the completion gate)
- [X] T023 Review the finished feature against Constitution Principles I-III — with specific
  attention to: the backfill lookup and YDK import introducing **zero** new network call shapes
  beyond what's documented, every drag-to-add and drag-to-bin action having a working,
  keyboard-operable non-drag equivalent, and zero data loss for pre-existing decks/engines after
  the Phase 2 migration — and address any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational completion. US1, US2, and US3 touch
  different functions within `collection.js`/`.html`/`.css` and have no functional dependency on
  each other (backlog detail lookup, engine bags, and deck bags are independent concerns) —
  implement in priority order: US1 → US2 → US3.
- **Polish (Phase 6)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (T002, T003). No dependency on US2/US3.
- **User Story 2 (P2)**: Depends on Foundational (T005). No dependency on US1/US3.
- **User Story 3 (P3)**: Depends on Foundational (T004, T005). Reuses US2's drag-to-bin pattern by
  reference (research.md/data-model.md describe the same mechanism for both) but does not call any
  US2 code directly — independently testable per quickstart.md Scenario 3-4 without US2 present.

### Within Each User Story

- Data/logic functions before render wiring before styling, since `collection.css` tasks in each
  story reference the classes/markup the `.js`/`.html` tasks establish.

### Parallel Opportunities

- None marked `[P]` beyond Setup's single task: nearly every task modifies `collection.js`/`.html`/
  `.css` incrementally on top of prior tasks in the same file, so they are executed sequentially
  within each phase to avoid conflicting edits.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Demo if ready — every backlog card showing real detail is already a complete, demonstrable fix

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP, the bug fix!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Add User Story 3 → validate (Scenarios 3-4) → demo
5. Polish phase → full quickstart.md pass (including keyboard-only and the YDK round trip) +
   constitution review

---

## Notes

- No `[P]` markers inside same-file task sequences: nearly every task edits a file the task before
  it also touched, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2/3 for traceability.
- Every data constraint quoted in a task (the exact-match `?name=` lookup, the one-attempt-per-page
  dedup rule, the engine-resolves-to-plain-cards-on-drop rule, the backlog-only YDK import-match
  rule) comes directly from `data-model.md` or `research.md` and must be enforced as written, not
  reinterpreted.
- Keyboard-operable non-drag equivalents for every drag gesture are **not optional polish** here —
  build them in the same task that creates the drag gesture (T012, T018), per this project's
  repeated lesson on this exact point.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving to the next.
