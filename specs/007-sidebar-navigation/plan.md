# Implementation Plan: Collapsible Sidebar Navigation

**Branch**: `007-sidebar-navigation` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-sidebar-navigation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Replace the per-page previous/next arrow links (`&larr;`/`&rarr;`) currently duplicated in the
headers of `index.html`, `collection.html`, and `tracker.html` with a single, shared, collapsible
sidebar that lists links to all three tool pages, highlights the active one, and remembers the
user's expand/collapse preference across page loads via `localStorage`. Because the project has no
build step or templating system, the sidebar is implemented as one shared vanilla-JS module
(`nav.js`) that injects its markup into the DOM at runtime and one shared stylesheet (`nav.css`),
each referenced identically from all three HTML files — avoiding triplicated markup that could
drift out of sync.

## Technical Context

**Language/Version**: HTML5, vanilla JavaScript (ES2017+, IIFE module pattern matching `app.js`/`collection.js`/`tracker.js`), CSS3

**Primary Dependencies**: None — no framework or library, consistent with the existing project

**Storage**: Browser `localStorage` (new key for sidebar expand/collapse state, alongside existing `ygoDeck` key pattern)

**Testing**: Manual browser verification across all three pages (no automated test suite exists in this project)

**Target Platform**: Modern desktop and mobile browsers, served as static files (same as existing pages)

**Project Type**: Static multi-page client-side web app (flat file structure at repo root)

**Performance Goals**: Sidebar toggle is visually instantaneous (CSS transition only, no layout thrash); adds no network requests

**Constraints**: No build step, no templating/includes available — shared behavior must be delivered as plain `.js`/`.css` files included identically by each static HTML page; must not break existing page-specific element IDs or scripts (`#appRoot`, `#collectionRoot`, `#trackerRoot` and their controllers)

**Scale/Scope**: 3 existing HTML pages to update, 1 new shared JS file, 1 new shared CSS file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Usability First** — PASS. The toggle control is a real `<button>` with `aria-expanded` and an accessible name; the active page link carries `aria-current="page"`; the sidebar and its links remain keyboard-operable; no destructive action is introduced (toggling/navigating is non-destructive, so no confirmation is required).
- **II. Minimal API Footprint** — PASS. The feature is purely client-side DOM/CSS/`localStorage` work; it adds zero calls to the YGOPRODeck API and does not touch existing search/debounce logic.
- **III. Maintainability & Simplicity** — PASS. A single shared `nav.js` + `nav.css`, included identically by all three pages, avoids triplicating the navigation list across HTML files (the exact drift problem the old per-page arrow links already had, e.g. `index.html` not linking to `tracker.html` at all). No new dependency, framework, or build step is introduced.

No violations identified; Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/007-sidebar-navigation/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
# Existing flat static-site layout — no src/ or tests/ directories in this project
index.html          # Proxy Sheet Builder page (updated: remove arrow <nav>, add sidebar include)
collection.html      # Draft Collection Manager page (updated: remove arrow <nav>, add sidebar include)
tracker.html         # Progression Series Pack Puller page (updated: remove arrow <nav>, add sidebar include)
style.css            # Existing page-specific styles (index.html) — unchanged
collection.css       # Existing page-specific styles (collection.html) — unchanged
tracker.css          # Existing page-specific styles (tracker.html) — unchanged
app.js               # Existing page-specific script (index.html) — unchanged
collection.js        # Existing page-specific script (collection.html) — unchanged
tracker.js           # Existing page-specific script (tracker.html) — unchanged
nav.css              # NEW — shared sidebar styles, included by all three pages
nav.js               # NEW — shared sidebar markup injection, toggle, active-link, and persistence logic
```

**Structure Decision**: Single flat static-site structure (already in use — no `src/`/`tests/`
split exists or is warranted here). The feature adds exactly two new shared files, `nav.css` and
`nav.js`, referenced identically from each of the three existing HTML pages, and trims the
page-specific `<nav class="app-nav">` arrow-link markup from each page's `<header>`. No existing
page-specific CSS/JS file is restructured.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
