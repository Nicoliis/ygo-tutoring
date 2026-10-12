---

description: "Task list for feature implementation"
---

# Tasks: Collapsible Sidebar Navigation

**Input**: Design documents from `/specs/007-sidebar-navigation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/nav-component.md, quickstart.md

**Tests**: Not requested — this project has no automated test suite (per plan.md Technical Context and the project constitution); verification is manual via quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Flat static-site layout at repository root (see plan.md "Project Structure") — no `src/`/`tests/`
split. New shared files: `nav.js`, `nav.css`. Modified files: `index.html`, `collection.html`,
`tracker.html`.

---

## Phase 1: Setup

**Purpose**: Create the two new shared files that every user story builds on.

- [X] T001 [P] Create empty shared stylesheet `nav.css` at repository root with a top comment noting it is shared across `index.html`, `collection.html`, and `tracker.html` (per [contracts/nav-component.md](./contracts/nav-component.md)).
- [X] T002 [P] Create empty shared script `nav.js` at repository root, wrapped in a `(() => { "use strict"; ... })();` IIFE matching the module pattern used by `app.js`/`collection.js`/`tracker.js`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the shared sidebar skeleton into all three pages and establish the static
navigation data — this must exist before any user story's behavior can be added or tested.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 In `nav.js`, define the static navigation entry list per [data-model.md](./data-model.md) "Navigation Entry" (fixed instance data): `[{label: "Proxy Sheet Builder", href: "index.html"}, {label: "Draft Collection Manager", href: "collection.html"}, {label: "Progression Series Pack Puller", href: "tracker.html"}]`.
- [X] T004 In `nav.js`, implement active-page detection per [research.md](./research.md) Decision 4: derive the current page's filename from `location.pathname` (treat an empty/`/` path as `index.html`) and compute `isActive` for each navigation entry by comparing it to each entry's `href`.
- [X] T005 In `nav.js`, on `DOMContentLoaded`, build the sidebar DOM per [contracts/nav-component.md](./contracts/nav-component.md) §"What `nav.js` guarantees": a `<aside id="appSidebar">` containing a toggle `<button>` and a `<nav aria-label="Tool navigation">` with one `<a>` per navigation entry; insert `<aside id="appSidebar">` as the first child of `<body>` and add class `has-app-sidebar` to `<body>`.
- [X] T006 In `nav.js`, for the entry whose `isActive` is true, set `aria-current="page"` on its link and make it a non-navigating no-op per FR-008 (e.g., render it as a `<span>`/disabled-style link, or prevent its default click action) rather than a clickable `href`.
- [X] T007 In `nav.css`, add the base layout rules: `body.has-app-sidebar { display: flex; }`, `#appSidebar` base width/background/border consistent with the site's existing look (reference `style.css` color/spacing values), and ensure the page's existing root container (`#appRoot`/`#collectionRoot`/`#trackerRoot`) is allowed to flex (`flex: 1; min-width: 0;`) next to the sidebar.
- [X] T008 [P] In `index.html`, add `<link rel="stylesheet" href="nav.css">` to `<head>` and `<script src="nav.js"></script>` before the existing `<script src="app.js"></script>`, then remove the `<nav class="app-nav">...</nav>` block from its `<header class="app-header">` per FR-006.
- [X] T009 [P] In `collection.html`, add `<link rel="stylesheet" href="nav.css">` to `<head>` and `<script src="nav.js"></script>` before the existing `<script src="collection.js"></script>`, then remove the `<nav class="app-nav">...</nav>` block from its `<header class="app-header">` per FR-006.
- [X] T010 [P] In `tracker.html`, add `<link rel="stylesheet" href="nav.css">` to `<head>` and `<script src="nav.js"></script>` before the existing `<script src="tracker.js"></script>`, then remove the `<nav class="app-nav">...</nav>` block from its `<header class="app-header">` per FR-006.

**Checkpoint**: Loading any of the three pages now shows a sidebar listing all three tools with
the current page marked active (not yet collapsible); no arrow links remain. Foundation ready for
user story work.

---

## Phase 3: User Story 1 - Navigate between tools via sidebar (Priority: P1) 🎯 MVP

**Goal**: From any tool page, a user can see and click through to any other tool page via the
sidebar, with the current page clearly marked.

**Independent Test**: From each of the three pages, open the sidebar and click each of the other
two entries; confirm navigation lands on the correct page and that page's own entry is now shown
active (per quickstart.md Scenario 1).

### Implementation for User Story 1

- [X] T011 [US1] In `nav.css`, style the navigation link list inside `#appSidebar nav`: spacing, hover state, and a distinct visual treatment (e.g., background/border-left accent) for the `[aria-current="page"]` entry so the active page is clearly distinguishable (FR-002).
- [X] T012 [US1] In `nav.css`, add a visible `:focus-visible` outline style for sidebar links and the toggle button, matching the project's existing interactive-element focus conventions (Constitution Principle I — keyboard operability).
- [X] T013 [US1] Manually verify quickstart.md Scenario 1 (navigate between all tools) and Scenario 5 steps 1–2 (keyboard reachability/focus of links) across all three pages; fix any discovered issues in `nav.js`/`nav.css`.

**Checkpoint**: User Story 1 is fully functional and independently testable — sidebar navigation
fully replaces the old arrow links.

---

## Phase 4: User Story 2 - Expand and collapse the sidebar (Priority: P1)

**Goal**: A user can hide the sidebar to reclaim screen space and bring it back, with their choice
remembered across page loads and navigations.

**Independent Test**: Toggle the sidebar closed, confirm content reflows and the sidebar shrinks/
hides; toggle it open again and confirm it returns to full width; reload and confirm the last
state persists (per quickstart.md Scenario 2).

### Implementation for User Story 2

- [X] T014 [US2] In `nav.js`, implement `readCollapsedState()`/`writeCollapsedState()` helpers around the `localStorage` key `ygoSidebarCollapsed` per [data-model.md](./data-model.md) "Sidebar State" (string `"true"`/`"false"`; wrap reads/writes in `try/catch` consistent with `app.js`'s existing `localStorage` handling for `ygoDeck`).
- [X] T015 [US2] In `nav.js`, on load, when no stored preference exists, derive the initial collapsed state from `window.matchMedia("(max-width: 640px)").matches` (collapsed if true, expanded if false) per [research.md](./research.md) Decision 3; apply the resulting state by toggling a `collapsed` class on `#appSidebar`.
- [X] T016 [US2] In `nav.js`, wire the toggle `<button>`'s click handler to flip the `collapsed` class on `#appSidebar`, update the button's `aria-expanded` attribute to reflect the new state, and persist the new state via `writeCollapsedState()`.
- [X] T017 [US2] In `nav.css`, add the `#appSidebar.collapsed` desktop state (width ≥ 641px): shrink the sidebar to an icon-only rail (hide link text labels, e.g., via `aria-hidden`-friendly visually-hidden text or icon-only rendering) while keeping the toggle button visible and operable.
- [X] T018 [US2] In `nav.css`, add the `@media (max-width: 640px)` overrides from [research.md](./research.md) Decision 3: the expanded sidebar renders as an overlay (`position: fixed`/`absolute` with elevation) above page content rather than pushing it, so `body.has-app-sidebar` does not shrink the main content's width at this breakpoint.
- [X] T019 [US2] In `nav.css`, add a CSS `transition` on `#appSidebar`'s width/transform so expand/collapse is visually smooth without introducing a perceptible delay (SC-002).
- [X] T020 [US2] Manually verify quickstart.md Scenario 2 (expand/collapse + reload persistence) and Scenario 4 (narrow-viewport default-collapsed + overlay behavior) across all three pages; fix any discovered issues in `nav.js`/`nav.css`.

**Checkpoint**: User Stories 1 AND 2 both work independently — the sidebar fully navigates and
fully expands/collapses with persistence.

---

## Phase 5: User Story 3 - Consistent navigation across all pages (Priority: P2)

**Goal**: The same sidebar, with the same links and the same expand/collapse state, behaves
identically no matter which tool page the user is on.

**Independent Test**: Collapse the sidebar on one page, navigate to a different tool page via the
sidebar, and confirm the collapsed state and the full link list are identical there (per
quickstart.md Scenario 3).

### Implementation for User Story 3

- [X] T021 [US3] Review `style.css`, `collection.css`, and `tracker.css` for any existing selectors that could collide with `#appSidebar`'s class/ID names (e.g., generic `nav`, `aside`, `.btn` selectors bleeding into the sidebar's own button); add scoping (e.g., prefix sidebar-internal classes, or increase specificity in `nav.css`) wherever a collision is found so each page's existing styles cannot alter the sidebar's appearance.
- [X] T022 [US3] Manually verify quickstart.md Scenario 3 end-to-end (collapse on `index.html` → navigate to `collection.html` → navigate to `tracker.html`, confirming the sidebar's collapsed state and link set are identical on each) and confirm SC-003 (identical entries on all three pages) and SC-005 (no leftover arrow links anywhere) hold.

**Checkpoint**: All three user stories are independently functional; sidebar behavior is uniform
across the whole site.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final accessibility/regression pass across the whole feature.

- [X] T023 [P] Manually verify quickstart.md Scenario 5 in full (keyboard-only operation of the toggle and all links, `aria-expanded` state flips, visible focus indicators) across all three pages.
- [X] T024 Manually re-verify each page's pre-existing functionality is unaffected by the sidebar: search/deck building on `index.html`, backlog/engine management on `collection.html`, and set tracking on `tracker.html` (no console errors introduced by `nav.js`/`nav.css`).
- [X] T025 Run the full quickstart.md validation guide end-to-end (all 5 scenarios) as a final sign-off.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Independent of US1 (adds the `collapsed` class/toggle on top of the sidebar skeleton US1 also builds on, but does not require US1's styling tasks to be done first).
- **User Story 3 (Phase 5)**: Depends on Foundational completion; best validated after US1 and US2 exist (since it verifies their combined consistency), so implement last even though independently testable in principle.
- **Polish (Phase 6)**: Depends on all three user stories being complete.

### Within Each User Story

- US1: CSS styling (T011, T012) before manual verification (T013).
- US2: State helpers (T014) → initial-state application (T015) → toggle wiring (T016) → CSS states (T017, T018, T019) → manual verification (T020).
- US3: Style-collision review (T021) before manual verification (T022).

### Parallel Opportunities

- T001 and T002 (Setup) can run in parallel — different files.
- T008, T009, T010 (per-page HTML edits in Foundational) can run in parallel — different files, same mechanical edit pattern.
- T017, T018, T019 (US2 CSS states, all in `nav.css`) are sequential edits to the same file — not parallel.
- T023 (Polish) can run in parallel with T024 since they inspect different concerns, though both are manual/observational.

---

## Parallel Example: Foundational Phase

```bash
# After T003–T007 establish nav.js/nav.css content, apply the per-page include/remove edits together:
Task: "Add nav.css/nav.js includes and remove arrow <nav> from index.html"
Task: "Add nav.css/nav.js includes and remove arrow <nav> from collection.html"
Task: "Add nav.css/nav.js includes and remove arrow <nav> from tracker.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Run quickstart.md Scenario 1 across all three pages.
5. At this point the old arrow navigation is fully replaced by a working (always-expanded)
   sidebar — a usable incremental improvement even before collapse/expand ships.

### Incremental Delivery

1. Setup + Foundational → sidebar skeleton present and linking correctly on all pages.
2. Add User Story 1 → sidebar navigation fully styled and keyboard-accessible → validate → ship.
3. Add User Story 2 → expand/collapse with persistence → validate → ship.
4. Add User Story 3 → cross-page consistency hardening/verification → validate → ship.
5. Polish → final full-site regression pass.

---

## Notes

- [P] tasks touch different files with no interdependency.
- [Story] label maps each task to its user story for traceability.
- No automated tests exist for this project; every "verify" task is a manual quickstart.md pass.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently before moving on.
