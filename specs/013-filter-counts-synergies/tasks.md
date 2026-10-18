# Tasks: Filter Counts & Synergy Tab

**Input**: Design documents from `/specs/013-filter-counts-synergies/` (plan.md, spec.md, research.md, data-model.md, contracts/synergy-filter-contract.md, quickstart.md)

**Tests**: The plan adds pure-logic checks to `shared/contract-tests.js` (the project's existing contract-test runner: `node shared/profiles.test.js` or `shared/tests.html`); UI is validated with quickstart.md (no automated UI suite, per the constitution). Contract-test tasks are therefore included inside each story.

**Format**: `- [ ] [ID] [P?] [Story] Description with file path`. [P] = different files, no dependency on an unfinished task.

## Phase 1: Setup

- [X] T001 Create the pure module `shared/backlog-synergy.js` with a header comment (no DOM, no storage; functions listed in contracts/synergy-filter-contract.md) and register it in both test runners: a `<script src="backlog-synergy.js"></script>` line before `backlog-filter.js` in `shared/tests.html`, and `read("backlog-synergy.js"),` before `read("backlog-filter.js"),` in the module list of `shared/profiles.test.js`
- [X] T002 [P] Add `<script src="../shared/backlog-synergy.js"></script>` immediately before the `backlog-filter.js` script tag in `workshop/backlog.html`, `workshop/synergy.html` and `workshop/deckbuilding.html`

## Phase 2: Foundational (blocks all user stories)

- [X] T003 In `shared/backlog-synergy.js` implement `cardEffectText(card)`: join `effect`, `desc`, `pendDesc`, `monsterDesc` (those present) with a space; empty string when none
- [X] T004 In `shared/backlog-synergy.js` implement `synergyKey(name)`: lower-case, trim, collapse inner whitespace to single spaces
- [X] T005 In `shared/backlog-synergy.js` implement `quotedNames(text)`: return names found between straight (`"…"`) or curly (`“…”`) double quotes, 1–80 characters after trimming, whitespace collapsed, duplicates removed case-insensitively (first spelling kept, original order)
- [X] T006 In `shared/backlog-synergy.js` implement `cardTiedTo(card, key)`: true when `quotedNames(cardEffectText(card))` contains a name whose `synergyKey` equals `key`, OR the lower-case `card.name` contains `key`; unquoted mentions in effect text MUST NOT count
- [X] T007 In `shared/backlog-synergy.js` implement `buildSynergyIndex(cards)` returning `{ entries: [{ key, label, count }], tied(card, key) }`: collect each card's quoted keys once, build the global key set, then count each card at most once per key (own-name containment plus its own quoted keys); sort entries by `count` descending then `label` A→Z; tolerate cards with missing fields
- [X] T008 In `shared/backlog-filter.js` add the `synergy` field to the filter: `emptyFilter()` returns `{ types: [], values: {}, synergy: [] }`; `sanitizeFilter` keeps `synergy` only as a unique array of non-empty trimmed strings each at most 80 characters (missing/older records load as `[]`, unknown top-level fields still preserved on save)
- [X] T009 In `shared/backlog-filter.js` update activity rules: `isFilterActive` is true when any type is ticked OR `synergy` is non-empty; `activeTypeCount` is renamed `activeFilterCount` (update its uses in `shared/backlog-panel.js` and any other caller) and returns ticked types plus 1 when a synergy selection exists; `saveBacklogFilter` clears the key only when neither is active (depends on T008)

**Checkpoint**: pure rules exist; no UI changes yet.

## Phase 3: User Story 1 - Counts next to every filter value (Priority: P1) 🎯 MVP

**Goal**: Every value chip and the Monster include boxes show how many distinct Backlog cards have that value; tab totals remain.

**Independent Test**: quickstart.md scenarios 1–3: the count next to a value equals the number of cards listed after selecting only that value; counts do not change when other values are selected.

- [X] T010 [US1] In `shared/backlog-filter.js` implement `valueCounts(cards, groupId)` returning `{ [valueGroup]: { [value]: number } }` for the list value groups of that tab (not the ATK/DEF ranges), counting distinct cards of that tab via `groupOf`/`filterValueOf`; for `groupId === "monster"` also return `"monster-normal"` and `"monster-effect"` counts using `monsterKind`; values keyed by `String(value)`
- [X] T011 [P] [US1] Add contract tests in `shared/contract-tests.js`: `valueCounts` counts distinct cards per attribute, race, level and Spell/Trap sub-type; the Monster normal+effect counts sum to the Monster tab total; a card missing a value is not counted for it; selecting only a value via `matchesFilter` returns exactly its count
- [X] T012 [US1] In `shared/backlog-filter-modal.js` `renderPanel`, compute `valueCounts(getCards(), id)` once per render and print each chip as `<value> (<count>)`; the count sits inside the chip's label so the accessible name already reads `<value> (<count>)`
- [X] T013 [US1] In `shared/backlog-filter-modal.js` `renderPanel`, show the include boxes' labels with counts for the Monster tab (`Include normal (n)`, `Include effect (n)`) using the `monster-normal` / `monster-effect` counts
- [X] T014 [US1] In `shared/backlog-filter.css` add a muted style for the count text inside `.bf-chip` (the `.bf-chip-count` span created in T012) so counts are readable but secondary (after T012)
- [X] T015 [US1] Verify counts refresh and tab totals stay (FR-003: each tab header already shows its card total from feature 012; confirm it is unchanged) after background completion: in `shared/backlog-filter-modal.js` confirm the existing `completeMissingCardDetails(...).then(...)` re-render recomputes counts (the call to `renderPanel(activeTab)` already does; add `refreshTabLabels()` if not), and run quickstart scenarios 1–3

**Checkpoint**: User Story 1 works on its own and is the MVP.

## Phase 4: User Story 2 - Filter by synergy names across all card types (Priority: P1)

**Goal**: A "Synergy" tab lists quoted names with counts and a search box; selecting names lists every card tied to any of them, across types, combined with type tabs by AND.

**Independent Test**: quickstart.md scenarios 4–6.

- [X] T016 [P] [US2] Add contract tests in `shared/contract-tests.js` for `shared/backlog-synergy.js`: `quotedNames` handles straight and curly quotes, trims, de-duplicates case-insensitively and ignores unquoted text and over-long quotes; `buildSynergyIndex` counts a card once per key, includes a card through its own name and through others quoting it, ignores unquoted mentions, sorts by count desc
- [X] T017 [P] [US2] Add contract tests in `shared/contract-tests.js` for filtering: `matchesFilter` with only `synergy` selected returns tied cards of every type; two names combine with OR; synergy plus a ticked type requires both; empty `synergy` does not restrict; `sanitizeFilter` drops non-strings/empty/duplicate/over-80-character entries and loads an old record as `synergy: []`
- [X] T018 [US2] In `shared/backlog-filter.js` update `matchesFilter(card, filter)`: first apply the type rule only when a type is ticked (existing behavior), then apply the synergy rule only when `filter.synergy` is non-empty: the card must be tied (`cardTiedTo`) to at least one selected key; a filter with only synergy selected must not reject cards for lacking a ticked type (depends on T006, T008, T009)
- [X] T019 [US2] In `shared/backlog-filter-modal.js` add a tenth tab "Synergy" after the nine type tabs: extend the tab list/panel/keyboard handling (arrows, Home/End) to include it without changing the type-tab logic; the draft already carries `draft.synergy` (default `[]` when missing)
- [X] T020 [US2] In `shared/backlog-filter-modal.js` build the Synergy panel: compute `buildSynergyIndex(getCards())` when the window opens (cache it and rebuild after background completion), render a search input (`aria-label="Search synergy names"`) and a scrollable checkbox list `<label> (<count>)` of `entries` (highest count first), filtering the list as the user types without recomputing the index; checked state reads/writes `draft.synergy` keys; accessible name includes the count; every key in `draft.synergy` that is missing from the index (a saved name no card mentions any more) is still listed, checked, with count 0 and its key as the label, so the user can untick it (US3 scenario 4); an empty state says "No quoted names found in your cards yet"
- [X] T021 [US2] In `shared/backlog-filter-modal.js` show the number of synergy names in the tab label ("Synergy (n)", marked with the existing "on" marker when `draft.synergy` is non-empty); the existing Clear filter button already removes the whole stored record, synergy included (verify this in quickstart scenario 7)
- [X] T022 [P] [US2] In `shared/backlog-filter.css` style the Synergy panel (search box width, scrollable list with a max height, one name per row) and, if the ten tabs no longer fit on one line, reduce `.bf-tab` padding so all tabs stay on one row
- [X] T023 [US2] Extend background completion for effect text: in `collection/collection-backfill.js` change the "needs details" test in `completeMissingCardDetails` to `(!card.race || !cardEffectText(card)) && !card.detailsTried` (use the same predicate where the filter modal selects `missing` cards in `shared/backlog-filter-modal.js`), keeping batching of 50 ids and the once-per-card marker; add a `cardEffectText` fallback guard (`typeof cardEffectText === "function"`) so pages that lack `backlog-synergy.js` still work
- [ ] T024 [US2] Run quickstart scenarios 4–6 and 10 (background completion refreshes the synergy list)

**Checkpoint**: Synergy filtering works with the type tabs.

## Phase 5: User Story 3 - Persistence and visible state (Priority: P2)

**Goal**: The synergy selection persists per profile, restores on every Backlog screen, shows in the icon state and in the empty-result message, and is cleared by Clear.

**Independent Test**: quickstart.md scenarios 7–9.

- [X] T025 [US3] In `shared/backlog-panel.js` `updateBacklogFilterButton`, use the renamed `activeFilterCount` and `isFilterActive` so a synergy-only filter shows the active state; change the label/title text to "Filter active" wording that does not claim only card types (for example `Filter backlog (filter active)` / `Filter active: n selected`)
- [X] T026 [US3] In `collection/collection-render-backlog.js` confirm the "No cards match your filter." message and its Clear button also appear for synergy-only filters (the condition uses `isFilterActive`; adjust if it checks types directly)
- [X] T027 [P] [US3] Add contract tests in `shared/contract-tests.js`: saving a synergy-only filter persists under `ygoBacklogFilter_<profile>` and restores; per-profile isolation (profile B unaffected); `clearBacklogFilter` removes it; a saved name that matches no card keeps loading and matches nothing without errors; the key appears in `buildBackup().data`
- [X] T028 [US3] Run quickstart scenarios 7–9 (reload, other Backlog screens, discard without Apply, old record)

## Phase 6: Polish & Cross-Cutting

- [X] T029 [P] Run all pure checks (`node shared/profiles.test.js` and open `shared/tests.html`) and fix failures
- [X] T030 [P] Update the comment header of `shared/backlog-filter.js` (filter shape now includes `synergy`, matching rule with AND/OR) and keep `specs/013-filter-counts-synergies/contracts/synergy-filter-contract.md` in sync with any signature changes made during implementation
- [X] T031 Performance check with a Backlog of about 2,000 cards (generate test cards in the console): window opens and a synergy selection applies in under 1 s (SC-004); if slower, cache the index per card-list length and rebuild only after completion
- [ ] T032 Accessibility pass (quickstart scenario 12): keyboard path to the Synergy tab, search box, checkboxes; names announced with counts
- [ ] T033 Run the full quickstart.md once on a profile with a populated Backlog

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. T008–T009 (filter shape) block T018 and T025–T028.
- **US1** depends only on Phase 2 (T010 needs none of the synergy code) and can ship alone (MVP).
- **US2** depends on T003–T009; independent of US1 except that both edit `shared/backlog-filter-modal.js` (do T012–T013 before T019–T021 to avoid merge conflicts).
- **US3** depends on US2 (it persists and displays the synergy selection) and on T008–T009.
- Within a story: pure logic and tests first, then modal UI, then CSS/verification.

## Parallel Opportunities

- T002 (HTML tags) alongside T003–T007 (different files).
- T011 can run while T012–T013 are written (T014 follows T012); T016, T017 can run alongside T018.
- T022 (CSS) alongside T019–T021; T027 alongside T025–T026.
- T029, T030 in the polish phase.

### Parallel example (User Story 2)

```text
T016  contract tests for synergy rules   (shared/contract-tests.js)
T017  contract tests for filtering       (shared/contract-tests.js, different test block)
T022  Synergy panel styling              (shared/backlog-filter.css)
```

## Implementation Strategy

1. **MVP**: Phases 1–2 and User Story 1 (counts) → validate with quickstart 1–3.
2. **Increment 2**: User Story 2 (Synergy tab) → validate 4–6 and 10.
3. **Increment 3**: User Story 3 (persistence/state) → validate 7–9.
4. Finish with Phase 6.
