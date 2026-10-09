# Implementation Plan: Draft Collection Manager

**Branch**: `001-draft-collection-manager` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-draft-collection-manager/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A client-side tool for tracking an owned-card backlog from continuous draft formats, bundling
synergistic cards into reusable named "engines," and assembling/exporting multiple independent
decks built from that backlog and those engines. Implemented as a new static page
(`collection.html` + `collection.js` + `collection.css`) alongside the existing proxy-sheet
builder, using the same plain-JS, no-build-step, `localStorage`-only approach already
established in this repository, with no new external API calls.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None. No framework or external runtime library; matches the existing
proxy-sheet-builder page's dependency-free approach.

**Storage**: Browser `localStorage`, as a JSON blob per collection (backlog + engines + decks),
mirroring the existing `ygoDeck` persistence pattern in `app.js`.

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`, per the constitution's Development Workflow.

**Target Platform**: Modern desktop and mobile web browsers (same support target as the existing
page); works fully offline once loaded, no server required.

**Project Type**: Single static client-side web app (new page within the existing flat-file
repository layout).

**Performance Goals**: All backlog/engine/deck operations (add, search, allocate, export) are
local, in-memory array operations and MUST feel instantaneous (no perceptible delay) for the
scale below; no network round-trip is on the critical path for any core action.

**Constraints**: No backend, no build pipeline, no server-side state (constitution's Additional
Constraints); no new calls to the YGOPRODeck API or any other external API; data must persist
across browser sessions via `localStorage` alone.

**Scale/Scope**: Single user, local-only data; designed for low hundreds of backlog card entries,
and at least 5 concurrently active engines and 5 concurrently active decks (per SC-006) without
degradation — well within what a plain in-memory array and `Array.prototype` filtering handles.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | Every mutating action (add/remove card, delete engine, delete deck) gives immediate visible feedback; destructive actions (delete card/engine/deck) require confirmation; all controls are keyboard-reachable with accessible names. | PASS — planned in data-model.md / quickstart.md UI flows, same pattern as existing `confirm()` use for "Clear deck." |
| II. Minimal API Footprint | Feature introduces zero new external API calls; card names are free-text, no live lookup added in this iteration. | PASS — no network calls in scope at all for this feature. |
| III. Maintainability & Simplicity | Plain HTML/CSS/JS, no framework, no build step; new concern lives in its own new files rather than growing `app.js`/`index.html`, keeping the existing proxy-builder page's diff untouched. | PASS — see Project Structure below. |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/001-draft-collection-manager/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify command)
```

No `contracts/` directory: this feature exposes no API, CLI, or other interface to external
callers — it is a self-contained client-side page, so there is no contract to document.

### Source Code (repository root)

```text
index.html        # existing — proxy-sheet builder page (untouched by this feature)
app.js             # existing — proxy-sheet builder logic (untouched by this feature)
style.css          # existing — proxy-sheet builder styles (untouched by this feature)

collection.html    # NEW — Draft Collection Manager page (backlog, engines, decks UI)
collection.js      # NEW — all logic: persistence, backlog, engines, decks, export
collection.css     # NEW — styles for the collection manager page
```

**Structure Decision**: This repository is a flat, build-free static site (no `src/`, no
framework). Following Constitution Principle III, this feature is added as its own sibling
page/script/stylesheet trio rather than being merged into the existing proxy-builder files,
since the two tools serve different workflows (collection tracking vs. print-sheet building)
and keeping them separate keeps each file small and independently understandable. The two pages
may optionally cross-link (e.g. a nav link from one to the other) but share no runtime code or
build tooling.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` cascade rule requires a confirmation prompt listing affected engines/decks before a card delete proceeds; allocation is surfaced as a visible warning, never a silent failure. |
| II. Minimal API Footprint | PASS | Design introduces no network calls of any kind. |
| III. Maintainability & Simplicity | PASS | Data model is three flat entities plus derived (computed, not stored) allocation counts — no redundant state to keep in sync, no new abstractions beyond what three CRUD-like entities need. |

No new violations introduced by the Phase 1 design.
