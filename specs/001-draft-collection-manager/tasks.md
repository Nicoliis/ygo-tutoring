---

description: "Task list template for feature implementation"
---

# Tasks: Draft Collection Manager

**Input**: Design documents from `/specs/001-draft-collection-manager/`

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

- `collection.html` — new page markup
- `collection.js` — new page logic (all persistence, backlog, engines, decks, export)
- `collection.css` — new page styles
- `index.html` — existing proxy-sheet builder page (touched only for the Polish-phase nav link)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new page's three files before any feature logic is added.

- [X] T001 Create `collection.html` page skeleton: header with title, a nav link to/from
  `index.html`, and three empty section containers (`#backlogSection`, `#enginesSection`,
  `#decksSection`), linking `collection.css` and `collection.js`
- [X] T002 [P] Create `collection.css` with a base panel/grid layout consistent with the
  conventions already used in `style.css` (same visual language as the existing proxy-builder
  page)
- [X] T003 [P] Create `collection.js` skeleton: an IIFE with `"use strict"`, a `STORAGE_KEY`
  constant, DOM element lookups for the three section containers, and an `init()` function
  wired to run once the script loads

**Checkpoint**: Three empty, linked files exist; opening `collection.html` loads without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared persisted-data shape and OwnedCard model that every user story depends
on (per data-model.md).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `collection.js`, implement `loadCollection()` / `saveCollection()` reading and
  writing one JSON object `{ cards: [], engines: [], decks: [] }` under a single `localStorage`
  key, defaulting to that empty shape when nothing is stored yet (data-model.md "Top-level
  persisted shape")
- [X] T005 In `collection.js`, implement `nextId()` as a unique ID generator for cards, engines,
  and decks (same role as `nextUid()` in the existing `app.js`)
- [X] T006 In `collection.js`, implement OwnedCard CRUD: `addOrIncrementCard(name, quantity)` —
  `name` **required, non-empty after trim**; if a card with that name already exists, increment
  its `quantityOwned` instead of creating a duplicate; otherwise create a new entry —
  `quantityOwned` **integer, ≥ 0** (data-model.md OwnedCard rules); plus `setCardQuantity(cardId,
  quantity)` with the same quantity rule
- [X] T007 In `collection.js`, implement `computeAllocatedForCard(cardId)` and
  `computeAvailableForCard(cardId)` as derived (not stored) values: allocated = sum of this
  card's quantity across every `engines[].cards` entry plus every `decks[].items` entry of
  `type: 'card'` referencing it; available = `quantityOwned - allocated`, which **may be
  negative** (data-model.md OwnedCard derived fields — surfaced as a warning, never blocked)
- [X] T008 In `collection.js`, implement `removeCard(cardId)`: count how many engines and decks
  reference the card, show a confirmation naming those counts before proceeding (Constitution
  Principle I — confirm destructive actions), and on confirmation strip the reference from every
  `engines[].cards` and `decks[].items` entry that pointed to it (data-model.md OwnedCard
  deletion rule)
- [X] T009 In `collection.js`, wire `init()` to call `loadCollection()` then stub
  `renderBacklog()` / `renderEngines()` / `renderDecks()` so the page renders (even if sections
  are empty) before any user-story UI exists

**Checkpoint**: Foundation ready — `collection.js` can load/save the full collection and manage
OwnedCards; user story implementation can now begin.

---

## Phase 3: User Story 1 - Track the owned-card backlog (Priority: P1) 🎯 MVP

**Goal**: Let the user log owned cards from draft sessions and see/search the full backlog at a
glance.

**Independent Test**: Add cards by name and quantity, confirm the owned quantity accumulates
rather than duplicating, filter the list by a search term, and reload the page to confirm
persistence (quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T010 [US1] In `collection.js`, implement `renderBacklog(filterText)` to list every
  OwnedCard showing its name, `quantityOwned`, and `computeAvailableForCard()` result, styling
  negative availability as a visible warning (Constitution Principle I)
- [X] T011 [US1] In `collection.js`, implement the add-card form handler (name + quantity
  inputs) calling `addOrIncrementCard()` and re-rendering the backlog on submit
- [X] T012 [US1] In `collection.js`, implement per-card quantity-adjust and remove controls in
  each rendered backlog row, wired to `setCardQuantity()` and `removeCard()`
- [X] T013 [US1] In `collection.js`, implement the backlog search input handler: filter
  `renderBacklog()`'s displayed rows by case-insensitive substring match on card name (spec FR-003)
- [X] T014 [US1] In `collection.html`, add the backlog section markup inside `#backlogSection`:
  search input, add-card form (name + quantity), and the list container `renderBacklog()` targets
- [X] T015 [US1] In `collection.css`, style the backlog list, the allocation/availability warning
  state, and the empty-backlog message

**Checkpoint**: User Story 1 is fully functional and independently testable (quickstart.md
Scenario 1 passes) — this is the MVP.

---

## Phase 4: User Story 2 - Bundle synergistic cards into reusable "engines" (Priority: P2)

**Goal**: Let the user group 2+ backlog cards into a named, reusable engine bundle.

**Independent Test**: Create an engine from two backlog cards, confirm a single-card engine is
rejected, rename/edit one engine and confirm other engines are unaffected, and list multiple
distinct engines (quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T016 [US2] In `collection.js`, implement Engine CRUD: `createEngine(name, cardEntries)` —
  `name` **required, non-empty after trim**; `cardEntries` **must contain at least 2 distinct
  cardId entries**, each **referencing an existing OwnedCard** with **quantity integer ≥ 1**
  (data-model.md Engine validation, spec FR-004) — plus `updateEngine(engineId, changes)` and
  `deleteEngine(engineId)`
- [X] T017 [US2] In `collection.js`, implement `renderEngines()` listing each engine's name and
  its card/quantity contents (card names resolved from the backlog)
- [X] T018 [US2] In `collection.js`, implement the engine create/edit form handler: a
  multi-select of current backlog cards with a per-card quantity field, a name field, and an
  inline validation message when fewer than 2 cards are selected
- [X] T019 [US2] In `collection.html`, add the engine section markup inside `#enginesSection`:
  engine list container, create/edit form, and a delete control per engine
- [X] T020 [US2] In `collection.css`, style the engine list and the create/edit form, including
  the validation-error state from T018

**Checkpoint**: User Stories 1 and 2 both work independently (quickstart.md Scenario 2 passes).

---

## Phase 5: User Story 3 - Build multiple decks and export them (Priority: P3)

**Goal**: Let the user assemble multiple independent decks from backlog cards and/or engines,
and export any deck as a complete card list.

**Independent Test**: Create two decks mixing individual cards and an engine, edit one deck and
confirm the other is unchanged, and export a deck to confirm a complete, correctly totaled list
is produced (quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T021 [US3] In `collection.js`, implement Deck CRUD: `createDeck(name)`, `updateDeck(deckId,
  changes)`, `deleteDeck(deckId)`, `addItemToDeck(deckId, item)`, and
  `removeItemFromDeck(deckId, itemIndex)`, where every item has **quantity/copies integer ≥ 1**
  and its `cardId`/`engineId` **must reference an existing OwnedCard/Engine** (data-model.md Deck
  rules); editing or deleting one deck **MUST NOT** alter any other deck, engine, or OwnedCard's
  `quantityOwned` (spec FR-011)
- [X] T022 [US3] In `collection.js`, implement `resolveDeckCardList(deckId)`: flatten a deck's
  `items` into one `{ cardId, name, quantity }` list per data-model.md's `resolvedCardList` —
  `type: 'card'` entries contribute their `quantity` directly; `type: 'engine'` entries
  contribute, for each card in that engine, `engineCardQuantity × copies`; entries for the same
  `cardId` are summed into one line
- [X] T023 [US3] In `collection.js`, implement `renderDecks()` listing each deck's name and its
  `resolveDeckCardList()` output with totals
- [X] T024 [US3] In `collection.js`, implement the deck create/edit UI handlers: name field,
  add-item control (choose a backlog card or an engine, plus quantity/copies), remove-item
  control, and a delete-deck confirmation (Constitution Principle I)
- [X] T025 [US3] In `collection.js`, implement `exportDeck(deckId)`: build a plain-text card list
  (one `name` and `quantity` per line) from `resolveDeckCardList()`, and offer both a
  copy-to-clipboard action and a downloadable `.txt` file (spec FR-009)
- [X] T026 [US3] In `collection.html`, add the deck section markup inside `#decksSection`: deck
  list container, create/edit form with item-adding controls, and an export button per deck
- [X] T027 [US3] In `collection.css`, style the deck list, the item editor, and the export
  control

**Checkpoint**: All three user stories are independently functional (quickstart.md Scenario 3
passes).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Small finishing touches that span the whole feature.

- [X] T028 Add a reciprocal nav link between `index.html` and `collection.html` (plan.md
  Structure Decision — the two pages may cross-link but share no runtime code)
- [X] T029 Run through every scenario in `quickstart.md` in a browser and fix any discrepancies
  found (no automated test suite — per constitution Development Workflow, this manual pass is
  the completion gate)
- [X] T030 Review the finished feature against Constitution Principles I–III — visible feedback
  and confirmations (I), zero new API calls (II), file organization and simplicity (III) — and
  address any gaps found

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3-5)**: All depend on Foundational completion.
  - US2 (Phase 4) and US3 (Phase 5) build on code added by earlier phases (Engine CRUD before
    decks can reference engines), so implement in priority order: US1 → US2 → US3.
- **Polish (Phase 6)**: Depends on whichever user stories are implemented.

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (OwnedCard model). No dependency on US2/US3.
- **User Story 2 (P2)**: Depends on Foundational; its engines reference OwnedCards from US1's
  backlog but do not require any US1 *UI* code.
- **User Story 3 (P3)**: Depends on Foundational and on Engine CRUD existing from US2 (a deck
  item may reference an engine, per spec FR-007); independently testable once built, per
  quickstart.md Scenario 3.

### Within Each User Story

- Data/CRUD functions before render functions before form-handler wiring before markup/styling,
  since `collection.html`/`collection.css` tasks in each story reference the containers and
  classes the `collection.js` tasks establish.

### Parallel Opportunities

- T002 and T003 (different files: `collection.css`, `collection.js`) can run in parallel with
  each other and with T001.
- All other tasks modify `collection.js`, `collection.html`, or `collection.css` incrementally
  on top of prior tasks in the same file, so they are executed sequentially within each phase to
  avoid conflicting edits.

---

## Parallel Example: Setup Phase

```bash
# Launch the two independent file-creation tasks together:
Task: "Create collection.css with a base panel/grid layout"
Task: "Create collection.js skeleton with STORAGE_KEY constant and init()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 independently
5. Demo if ready — backlog tracking alone is already a usable increment

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. Add User Story 1 → validate (Scenario 1) → demo (MVP!)
3. Add User Story 2 → validate (Scenario 2) → demo
4. Add User Story 3 → validate (Scenario 3) → demo
5. Polish phase → full quickstart.md pass + constitution review

---

## Notes

- No `[P]` markers inside `collection.js`-only task sequences: nearly every task edits the same
  file as the task before it, so parallelizing them would risk conflicting edits.
- `[Story]` labels map tasks to spec.md's User Story 1/2/3 for traceability.
- Every data constraint quoted in a task (e.g. "non-empty after trim", "integer ≥ 1") comes
  directly from `data-model.md` or `spec.md` and must be enforced as written, not reinterpreted.
- Commit after each task or logical group; stop at any checkpoint to validate a story
  independently before moving to the next.

---

## Phase 7: Convergence

**Purpose**: Remediate gaps found by `/speckit-converge` between the implemented code and
spec.md / plan.md / data-model.md / the constitution.

- [X] T031 CRITICAL: In `collection.js`, add a descriptive `aria-label` to the `.btn-toggle`
  expand/collapse buttons on engine rows (`renderEngines()`) and deck rows (`renderDecks()`) —
  e.g. `` `${expanded ? "Hide" : "Show"} cards in ${engine.name}` `` — so the control's purpose
  is conveyed to assistive technology instead of relying on the "▸"/"▾" glyph alone, per
  Constitution I (contradicts)
- [X] T032 CRITICAL: In `collection.js`'s `renderDecks()`, add a descriptive `aria-label` to the
  `.btn-remove-item` button (currently `textContent = "✕"` with no accessible name) — e.g.
  `` `Remove ${label} from ${deck.name}` `` — matching the existing `aria-label="Remove from
  deck"` pattern already used by `app.js`'s `.tile-remove` button, per Constitution I
  (contradicts)
- [X] T033 LOW: Reconcile `spec.md`'s User Story 2 Acceptance Scenario 3 and User Story 3
  Acceptance Scenario 1 wording (which describe engine/deck card contents as shown whenever the
  list is viewed) with the implemented collapse-by-default display (contents shown only on
  expand) — via `/speckit-clarify` or a direct spec edit; this is a documentation reconciliation
  only, the collapse behavior itself is an intentional, already-approved design decision and
  should not be reverted (contradicts)
