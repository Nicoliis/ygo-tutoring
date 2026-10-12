---

description: "Task list for feature implementation"
---

# Tasks: Booster Draft

**Input**: Design documents from `/specs/008-booster-draft/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/page-integration.md, quickstart.md

**Tests**: Not requested — this project has no automated test suite (per plan.md Technical Context
and the project constitution); verification is manual via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing
of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Flat static-site layout at repository root (see plan.md "Project Structure"). New files:
`draft.html`, `draft.css`, `draft.js`. Modified file: `nav.js` (adds one navigation entry).

---

## Phase 1: Setup

**Purpose**: Create the new page's three files and make it reachable from the shared sidebar.

- [X] T001 [P] Create `draft.html` with the standard page skeleton matching `tracker.html`'s structure (doctype, `<head>` with `<title>Booster Draft</title>`, `<link rel="stylesheet" href="draft.css">`, `<link rel="stylesheet" href="nav.css">`; `<body>` with a root container `<div id="draftRoot">`, an `<header class="app-header"><h1>Booster Draft</h1></header>`, a `<main>` with placeholder sections for the config form, the chosen-cards strip, and the pick area; `<script src="nav.js"></script>` then `<script src="draft.js"></script>` before `</body>`).
- [X] T002 [P] Create empty `draft.css` at repository root with a top comment identifying it as the Booster Draft page's stylesheet, following the `:root` variable reuse pattern from `tracker.css`/`collection.css` (same `--bg`/`--panel`/`--accent`/etc. custom properties re-declared at the top).
- [X] T003 [P] Create empty `draft.js` at repository root, wrapped in a `(() => { "use strict"; ... })();` IIFE matching the module pattern used by `app.js`/`collection.js`/`tracker.js`/`nav.js`.
- [X] T004 In `nav.js`, add a fourth entry `{ label: "Booster Draft", href: "draft.html" }` to the `NAV_ENTRIES` array, per [contracts/page-integration.md](./contracts/page-integration.md) §1.

**Checkpoint**: `draft.html` loads, shows the shared sidebar (now listing 4 tools), and the other
three pages' sidebars now also list "Booster Draft."

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the data-fetching, caching, and drawing primitives every user story depends on,
and the page's base layout.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 In `draft.js`, define `API_BASE`, `SETS_URL`, `SET_CARDS_URL` constants matching `tracker.js`'s values (`https://db.ygoprodeck.com/api/v7/`, `cardsets.php`, `cardinfo.php`), and in-memory caches `allSetsCache` (null) and `setCardPoolCache` (`new Map()`), per [research.md](./research.md) Decision 1.
- [X] T006 In `draft.js`, implement `fetchAllSets()` by adapting `tracker.js`'s implementation: fetch `SETS_URL` once, cache the mapped `{name, releaseDate}` list in `allSetsCache`, return the cached value on subsequent calls, and show a clear error (consistent with `tracker.js`'s existing `alert(...)` pattern) on fetch failure.
- [X] T007 In `draft.js`, implement `getWeightForRarity(rarity)` identical to `tracker.js`'s version (Common/unrecognized = 10, Rare = 3, Super Rare = 1.5, Ultra/Secret/Ultimate/Ghost Rare = 1).
- [X] T008 In `draft.js`, define `DEFAULT_BOOSTER_SIZE = 9` and an initially-empty `BOOSTER_SIZE_OVERRIDES` object, plus `getBoosterSize(setName)` returning `BOOSTER_SIZE_OVERRIDES[setName]` if present, else `DEFAULT_BOOSTER_SIZE`, per [research.md](./research.md) Decision 2.
- [X] T009 In `draft.js`, implement `extractCardDataFromApiResult(apiCard)` identical in shape to `tracker.js`'s version (`apiId`, `type`, `imageSmall`, `imageFull`, `level`, `atk`, `def`), plus a new `parsePrice(apiCard)` helper that reads `apiCard.card_prices?.[0]?.tcgplayer_price`, returning `0` if absent/non-numeric, per [research.md](./research.md) Decision 3.
- [X] T010 In `draft.js`, implement `fetchSetCardPool(setName)` adapted from `tracker.js`: fetch `cardinfo.php?cardset=<setName>` once per distinct `setName` (cached in `setCardPoolCache`), mapping each card to `{name, weight, price, ...extractCardDataFromApiResult(card)}` per [data-model.md](./data-model.md) "Pool Card" (matching the `card_sets` entry whose `set_name` equals `setName`, never just the first entry, per `tracker.js`'s existing correctness rule), and show a clear error on fetch failure.
- [X] T011 In `draft.js`, implement `weightedRandomPick(pool)` identical to `tracker.js`'s version (weighted random selection by `.weight`).
- [X] T012 In `draft.css`, add the base page layout: config-fields row at the top (flex row with labeled booster/amount/cardpool/grouping controls and the Start Draft button), a slot for the chosen-cards strip (small, horizontal flex layout) positioned above the main pick area, and the main pick area taking primary visual weight (larger font/card size, centered), reusing `--panel`/`--panel-alt`/`--border`/`--accent` variables consistent with the other pages' look.

**Checkpoint**: `draft.js` can fetch and cache the set list and a given set's card pool, resolve a
booster size per set, and produce a single weighted-random card pick; `draft.css` lays out the
page's regions. No user-facing draft flow exists yet.

---

## Phase 3: User Story 1 - Configure and run a booster draft (Priority: P1) 🎯 MVP

**Goal**: A user can select a booster, amount, cardpool, and grouping criterion, see a live
kept/total preview, and start a draft to see the first pick group appear.

**Independent Test**: Select a booster, set amount=12 and cardpool=3, confirm the preview reads
"36/108" (for a 9-card booster), click "Start Draft," and confirm the first pick group renders.

### Implementation for User Story 1

- [X] T013 [US1] In `draft.html`, add the booster autocomplete field, amount number input (`min="1"`), cardpool number input (`min="1"`), grouping `<select>` (options: "Rarity", "Price"), the live kept/total readout element, and the "Start Draft" button, inside the config-fields container from T001; each input/select MUST have an associated `<label>` (or `aria-label`) so every control has an accessible name per Constitution Principle I.
- [X] T014 [US1] In `draft.js`, wire the booster autocomplete field to `fetchAllSets()` (lazy-fetched on first focus/interaction, matching `tracker.js`'s set-picker trigger pattern) and filter-as-you-type against the cached list; selecting a set stores `setName` and resolves `boosterSize = getBoosterSize(setName)` (T008) immediately (no network call needed for this step).
- [X] T015 [US1] In `draft.js`, implement the live kept/total calculation display: whenever `setName`, `amount`, or `cardpool` changes, compute and render `kept = amount * Math.floor(boosterSize / cardpool)` over `total = amount * boosterSize` (e.g., "36/108"), per FR-006 and data-model.md's Booster Draft Session fields.
- [X] T016 [US1] In `draft.js`, implement validation per FR-003/FR-004/FR-016: amount must be an integer ≥ 1; cardpool must be an integer with `1 ≤ cardpool ≤ boosterSize`; a booster must be selected. Disable "Start Draft" (or block its click handler) and show a clear inline message when any validation fails.
- [X] T017 [US1] In `draft.js`, implement the per-booster sort/group/shuffle pipeline function `buildPickGroupsForBooster(cards, cardpool, grouping)` per [research.md](./research.md) Decision 4 and [data-model.md](./data-model.md) "Pick Group": compute each card's `sortValue` (its `weight` if `grouping === "rarity"`, else its `price`), sort ascending by `sortValue`, slice into consecutive chunks of `cardpool` (final chunk may be shorter), then for each chunk swap in a same-booster card from a later chunk to replace any duplicate name when a distinct alternative exists elsewhere in that booster's cards (FR-009), then return the chunks shuffled into random order.
- [X] T018 [US1] In `draft.js`, implement the "Start Draft" click handler: validate (T016), set `status = "in-progress"`, call `fetchSetCardPool(setName)` (T010), draw `amount * boosterSize` cards via `weightedRandomPick` (T011) split into `amount` boosters of `boosterSize` cards each, run `buildPickGroupsForBooster` (T017) independently per booster, concatenate each booster's shuffled groups in booster order into `pickQueue`, and render the first pick group.
- [X] T019 [US1] Manually verify quickstart.md Scenario 1 (configure, live preview, validation blocking, Start Draft reveals first pick group) against a real set.

**Checkpoint**: User Story 1 is fully functional and independently testable — a user can configure
and start a draft and see the first pick group.

---

## Phase 4: User Story 2 - Pick one card from each presented group (Priority: P1)

**Goal**: A user can click a card in the current pick group, see it added to an alphabetically
sorted chosen-cards strip, and be advanced automatically through every remaining pick group.

**Independent Test**: With a draft started, click a card in the current group and confirm it is
added to the chosen-cards strip and the next group (or finish state) appears automatically.

### Implementation for User Story 2

- [X] T020 [US2] In `draft.js`, implement rendering of the current pick group (`pickQueue[0]`) as the main focus of the page (per FR-011), each card rendered as a clickable element showing at least its name (and image, if available from `imageSmall`, consistent with the "minicard" visual pattern already used in `tracker.js`'s booster pull review).
- [X] T021 [US2] In `draft.js`, implement the pick click handler: move the clicked card into `keptCards`, discard the rest of that group's cards, remove the resolved group from `pickQueue`, and either render the new `pickQueue[0]` (if any remain) or transition `status = "finished"` (if `pickQueue` is now empty), per FR-010/FR-013 and the data-model.md state transitions.
- [X] T022 [US2] In `draft.js`, implement rendering of the chosen-cards strip: a compact flex row positioned above the pick area, listing `keptCards` sorted alphabetically by `name` (FR-012), re-rendered after every pick.
- [X] T023 [US2] In `draft.js`, implement FR-017: once `status !== "configuring"`, disable/lock the booster, amount, cardpool, and grouping controls from T013, and add a visible "Cancel Draft" action that, when confirmed via a confirmation prompt (consistent with the existing "Clear deck" confirmation pattern in `app.js`), discards the in-progress session and returns to a fresh `"configuring"` state.
- [X] T024 [US2] In `draft.css`, style the current pick group's cards (clickable hover/focus states, `:focus-visible` outline) and the chosen-cards strip (small thumbnails/name chips in a wrapping flex row) so the pick area remains the visually dominant region of the page per FR-011.
- [X] T025 [US2] Manually verify quickstart.md Scenario 2 (pick loop, alphabetical chosen-cards strip, no duplicate names within a group, groups never mixing boosters) and Scenario 5 (config locking + confirmed cancel) across a full draft.

**Checkpoint**: User Stories 1 AND 2 both work independently — a full draft can be configured,
started, and picked through to completion.

---

## Phase 5: User Story 3 - Finish the draft and add results to the backlog (Priority: P2)

**Goal**: Once every pick group is resolved, the user can add all kept cards to the backlog in one
action and the tab resets for a new draft.

**Independent Test**: Complete every pick group, confirm the "finished" state and "Add to Backlog"
action appear, trigger it, and confirm the backlog in `collection.html` reflects the drafted cards.

### Implementation for User Story 3

- [X] T026 [US3] In `draft.js`, implement the "finished" state UI: when `status === "finished"`, replace the pick area with a summary of the completed draft and an "Add to Backlog" button (FR-014).
- [X] T027 [US3] In `draft.js`, implement the backlog merge per [contracts/page-integration.md](./contracts/page-integration.md) §3: read `localStorage["ygoCollection"]` (treating missing/unparseable data as an empty backlog), for each `keptCards` entry find an existing backlog entry by case-insensitive name match — increment `quantityOwned` and additively fill in missing fields if found, else append a new entry with `quantityOwned: 1` — then write the updated backlog back to `localStorage["ygoCollection"]` exactly once after all cards are merged.
- [X] T028 [US3] In `draft.js`, after a successful "Add to Backlog," reset the session to a fresh `"configuring"` state (clear `setName`/`amount`/`cardpool`/`grouping`/`pickQueue`/`keptCards`) per FR-018, re-enabling the config fields from T013.
- [X] T029 [US3] Manually verify quickstart.md Scenario 3 (finish state appears, the finished kept-card count exactly matches the pre-draft kept/total preview per SC-002, Add to Backlog merges correctly into `collection.html`'s backlog with correct quantities for both pre-owned and new cards, tab resets afterward) and Scenario 4 (price grouping with missing price data completes without errors).

**Checkpoint**: All three user stories are independently functional — the full configure → draft →
finish → backlog flow works end to end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final accessibility/regression pass across the whole feature.

- [X] T030 [P] Manually verify keyboard operability of the booster autocomplete, amount/cardpool inputs, grouping select, Start Draft, pick-group cards, Cancel Draft, and Add to Backlog controls (Constitution Principle I), including visible focus indicators and that every control exposes an accessible name (inspect via the browser's Accessibility panel: each input/select has a label or `aria-label`, each button's accessible name describes its action).
- [X] T031 Manually re-verify each of the other three pages' pre-existing functionality is unaffected by the `nav.js` change: sidebar still lists and navigates correctly on `index.html`, `collection.html`, and `tracker.html` (no console errors introduced by the new `NAV_ENTRIES` entry).
- [X] T032 Run the full quickstart.md validation guide end-to-end (all 5 scenarios) as a final sign-off, confirming no more than the two documented YGOPRODeck endpoints are called per session.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs a startable draft producing pick groups to have anything to pick from) — not independent of US1 in practice, despite being a separate user story in the spec.
- **User Story 3 (Phase 5)**: Depends on User Story 2 (needs a draft that can reach a finished state).
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- US1: Fields (T013) → autocomplete wiring (T014) → live preview (T015) → validation (T016) →
  pick-group pipeline (T017) → Start Draft handler (T018) → manual verification (T019).
- US2: Pick-group rendering (T020) → pick handler (T021) → chosen-cards strip (T022) → config
  locking/cancel (T023) → styling (T024) → manual verification (T025).
- US3: Finished-state UI (T026) → backlog merge (T027) → session reset (T028) → manual
  verification (T029).

### Parallel Opportunities

- T001, T002, T003 (Setup, different files) can run in parallel.
- T030 and T031 (Polish, independent concerns) can run in parallel.
- Within Foundational, T005–T011 are sequential edits to the same `draft.js` file (not parallel);
  T012 (`draft.css`) can run in parallel with the `draft.js` tasks since it's a different file.

---

## Parallel Example: Setup Phase

```bash
Task: "Create draft.html page skeleton"
Task: "Create empty draft.css with :root variables"
Task: "Create empty draft.js IIFE skeleton"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1.
5. At this point a user can configure and start a draft and see the first pick group — a visible,
   demonstrable slice even before the full pick loop or backlog integration exist.

### Incremental Delivery

1. Setup + Foundational → fetch/cache/draw primitives ready, page laid out.
2. Add User Story 1 → configure + start a draft → validate → ship.
3. Add User Story 2 → full pick-through-completion loop → validate → ship.
4. Add User Story 3 → finish + backlog integration → validate → ship.
5. Polish → final full-site regression pass.

---

## Notes

- [P] tasks touch different files with no interdependency.
- [Story] label maps each task to its user story for traceability.
- No automated tests exist for this project; every "verify" task is a manual quickstart.md pass.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.

---

## Phase 7: Follow-up — Click-to-view / drag-to-keep pick interaction (post-implementation)

**Purpose**: User feedback after initial implementation requested that clicking a pick-group card
open a detail view instead of immediately keeping it, and that a dedicated drop target let users
drag the card they want to keep. Implements spec.md FR-011a/FR-012a (added in the 2026-10-12
follow-up clarification).

- [X] [US2] In `draft.js`, add the shared `showModal`/`escapeHtml` helpers and
  `openPickCardDetailModal(card)` (adapted from `tracker.js`'s `showModal`/
  `openPulledCardDetailModal`), showing the card's image, type, level/rank, and ATK/DEF, with
  "Keep This Card" (primary, calls `handlePick`) and "Close" actions; add `#modalRoot` to
  `draft.html`.
- [X] [US2] In `draft.js`, change the pick-card click handler to open the detail modal instead of
  calling `handlePick` directly (FR-011a).
- [X] [US2] In `draft.js`, make each pick-card `draggable`, and add `dragover`/`drop` handlers on
  `#chosenStrip` so dropping a card onto it calls `handlePick` for that card (FR-012a).
- [X] In `draft.css`, add modal styles (adapted from `tracker.css`), a `.dragging`/`drag-over`
  visual state for the dragged card and the drop target, and an updated empty-state hint on the
  kept-cards strip ("drag a card here, or open one to pick it").
- [X] Manually verify (Playwright): click opens the detail modal without picking; "Keep This Card"
  picks and closes; "Close" and Escape leave the pick group unchanged; Tab+Enter opens the modal
  (keyboard-accessible path); dragging a card onto the kept-cards strip picks it. All confirmed
  with zero console errors against a live draft.

---

## Phase 8: Follow-up — Card effect/tags display and mainline-booster allowlist (post-implementation)

**Purpose**: Further user feedback: the detail view should show the card's effect text and other
attributes (only the ones present), using tags for fixed-value attributes; and the booster picker
should only offer official mainline TCG boosters, since the API has no product-line field to
filter by automatically. Implements spec.md FR-002, FR-011b (added in the 2026-10-12 follow-up #2
clarification).

- [X] In `draft.js`, extend `extractCardDataFromApiResult` to capture `humanReadableCardType`,
  `frameType`, `race`, `attribute`, `archetype`, `scale`, `linkval`, `linkmarkers`, `desc`,
  `pendDesc` (`pend_desc`), and `monsterDesc` (`monster_desc`) from the API response; Level is
  forced to `null` for Link Monsters since the API reports `level: 0` for them despite Link
  Monsters having no Level.
- [X] In `draft.js`, add `buildCardTags(card)` returning only the attributes that card actually
  has (Type, Attribute, Race/Property, Level or Rank, Pendulum Scale, Link Rating, Link Markers,
  ATK, DEF, Archetype) and `buildEffectHtml(card)` rendering the effect text (split into Pendulum
  Effect / Monster Effect sections when both exist, else a single Effect section, else nothing);
  wire both into `openPickCardDetailModal`.
- [X] In `draft.css`, add `.card-tags`/`.card-tag` (flex-wrapped, uniform pill styling) and
  `.card-effect-block` styles for the modal body.
- [X] In `draft.js`, replace the `cardsets.php`-backed autocomplete with a curated
  `MAINLINE_BOOSTERS` constant (official numbered TCG booster series only, cross-checked against a
  live `cardsets.php` snapshot to confirm each name's exact spelling and existence), removing the
  now-unused `fetchAllSets`/`allSetsCache`/`SETS_URL`; this also drops a redundant network call
  (the picker no longer fetches the full ~1000-set list at all).
- [X] Manually verify (Playwright): autocomplete shows only mainline boosters (e.g. no "Structure
  Deck" matches); Link Monster detail view omits the Level tag and shows Link Rating/Markers;
  non-monster (Spell/Trap) detail view shows a Property tag instead of Attribute/Race; a full draft
  still completes correctly via both the modal and drag-to-keep paths with zero console errors.

**Note**: The `MAINLINE_BOOSTERS` list was verified against a live API snapshot but relies on the
assistant's own knowledge for which sets count as "mainline" and is least reliable for sets
released very recently; it should be reviewed/extended periodically as new boosters release.

---

## Phase 9: Follow-up — Rarity glow display and isolated data file (post-implementation)

**Purpose**: User feedback requested a visual rarity "glow" on pick-group cards (white → blue →
yellow → red → further colors for rarer tiers), and that the mainline-booster list, rarity color
table, and any other reusable list be moved into a separate, isolated file rather than living
inside `draft.js`. Implements spec.md FR-011c, FR-019 (added in the 2026-10-12 follow-up #3
clarification).

- [X] Create `draft-data.js` — an isolated, behavior-free file containing `MAINLINE_BOOSTERS`,
  `DEFAULT_BOOSTER_SIZE`/`BOOSTER_SIZE_OVERRIDES`, and the new `RARITY_GLOW_TIERS` (ordered
  rarest-first, each with a keyword list and either a `color` or `animated: true`) plus
  `DEFAULT_RARITY_GLOW` (Common fallback); loaded as a plain classic script (top-level `const`s
  become ordinary globals shared with any script that follows it on the page — no build step, no
  module system).
- [X] In `draft.html`, add `<script src="draft-data.js"></script>` before `<script
  src="draft.js"></script>`.
- [X] In `draft.js`, remove the now-relocated `MAINLINE_BOOSTERS`/`BOOSTER_SIZE_OVERRIDES`/
  `DEFAULT_BOOSTER_SIZE` declarations (now resolved as globals from `draft-data.js`); add a raw
  `rarity` field to each pooled card (from the matching `card_sets` entry, alongside the existing
  `weight` derived from it) and a `getRarityGlow(rarity)` helper that walks `RARITY_GLOW_TIERS` for
  the first keyword match, falling back to `DEFAULT_RARITY_GLOW`.
- [X] In `draft.js`'s `renderPickGroup`, apply the resolved glow to each pick-card: set a
  `--glow-color` inline custom property for a solid-color tier, or add a `glow-starlight` class for
  the animated tier.
- [X] In `draft.css`, add the `--glow-color`-driven `box-shadow` on `.pick-card` (and its
  hover/focus state), plus the `glow-starlight` class and its `rarity-rainbow-glow` keyframe
  animation for the rarest tier.
- [X] Manually verify (Playwright): `draft.js` can read `MAINLINE_BOOSTERS`/`RARITY_GLOW_TIERS` as
  globals from `draft-data.js` (82/13 entries respectively); the booster autocomplete still works
  correctly after the refactor; pick-cards show distinct glow colors across common/rare/super
  rare/secret rare draws from live sets; the `glow-starlight` class correctly triggers the
  `rarity-rainbow-glow` animation. Zero console errors throughout.

---

## Phase 10: Follow-up — Extract modal and group-forming algorithms into their own files (post-implementation)

**Purpose**: User feedback requested that the card detail modal and the pick-group formation
(sort/dedupe/shuffle) algorithms be moved out of `draft.js` into their own files, continuing the
file-organization direction started in Phase 9. Unlike `draft-data.js`, these two new files hold
behavior (pure functions / a DOM-driven modal engine), not just data tables.

- [X] Create `draft-grouping.js` — moves `sortValueFor`, `shuffleArray`, `dedupeChunks`, and
  `buildPickGroupsForBooster` out of `draft.js` verbatim (pure functions, no DOM access, no
  session dependency); loaded as a plain classic script, exposing them as globals.
- [X] Create `draft-modal.js` — moves `escapeHtml`, `showModal`, `buildCardTags`,
  `buildEffectHtml`, and `openPickCardDetailModal` out of `draft.js`; decouples the "Keep This
  Card" action from `draft.js`'s `handlePick`/session state by changing
  `openPickCardDetailModal(card)` to `openPickCardDetailModal(card, onKeep)`, so the modal file has
  no knowledge of the draft session; `showModal` now resolves `#modalRoot` internally via
  `document.getElementById` rather than depending on a module-level reference from `draft.js`.
- [X] In `draft.js`, remove the extracted functions and the now-unused `modalRootEl` constant;
  update the pick-card click handler to
  `openPickCardDetailModal(card, () => handlePick(card))`.
- [X] In `draft.html`, add `<script src="draft-grouping.js"></script>` and `<script
  src="draft-modal.js"></script>` between `draft-data.js` and `draft.js`.
- [X] Manually verify (Playwright): all relocated functions resolve as globals from `draft.js`;
  clicking a pick-card still opens the modal with correct tags/effect text; "Keep This Card" and
  drag-to-keep both still work; a full draft still completes and merges into the backlog correctly.
  Zero console errors.
