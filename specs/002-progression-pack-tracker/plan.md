# Implementation Plan: Progression Series Pack Puller

**Branch**: `002-progression-pack-tracker` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-progression-pack-tracker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A client-side companion for logging Progression Series pack pulls — one or more independent
"trackers" (one per box), each optionally carrying a checklist of the box's known unique cards.
Logging a pull writes every named card directly into the same shared Backlog the existing Draft
Collection Manager already uses, and each tracker shows packs-opened and (when a checklist
exists) checklist-completion progress. Implemented as a new sibling static page
(`tracker.html` + `tracker.js` + `tracker.css`) that reads and writes the same `localStorage`
collection blob `collection.js` uses, extended with a new `trackers` array — no new network
calls, no shared runtime code between pages (matching the precedent set by the Draft Collection
Manager feature).

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None. No framework or external runtime library; matches both existing
pages' dependency-free approach.

**Storage**: The same browser `localStorage` key (`ygoCollection`) that `collection.js` already
uses, with its JSON shape additively extended with a `trackers` array alongside the existing
`cards`, `engines`, and `decks` arrays. Logging a pull mutates the shared `cards` array using the
exact same "merge by case-insensitive name" rule as `collection.js`'s `addOrIncrementCard`
(duplicated locally in `tracker.js`, since the two pages share no runtime code — see Project
Structure).

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`, per the constitution's Development Workflow.

**Target Platform**: Modern desktop and mobile web browsers (same support target as the other two
pages); works fully offline once loaded, no server required.

**Project Type**: Single static client-side web app — a third sibling page added to the existing
flat-file repository layout.

**Performance Goals**: Logging a pull (writing N card names into the shared backlog and into the
tracker's pull history) and recomputing checklist-completion progress are local, in-memory array
operations and MUST feel instantaneous; no network round-trip is on the critical path.

**Constraints**: No backend, no build pipeline, no server-side state; no new calls to any
external API; writes to the shared `localStorage` blob MUST be additive — this page must never
drop or corrupt the `cards`, `engines`, or `decks` data that `collection.js` owns.

**Scale/Scope**: Single user, local-only data; designed for a handful of concurrently active
trackers (3+, per SC-004), each with a checklist of up to roughly 100 unique cards (a large
real-world box) and a pull-history list that grows by one entry per pack opened — well within
what in-memory array operations handle without degradation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | Logging a pull and deleting a tracker give immediate visible feedback; tracker deletion requires confirmation; every interactive control (including any icon-only toggle) carries a descriptive `aria-label` from the start — called out explicitly here because the sibling Draft Collection Manager feature shipped two accessible-name regressions on icon-only buttons that only surfaced later, during `/speckit-converge`. | PASS — see data-model.md / quickstart.md; aria-label coverage is planned up front this time, not retrofitted. |
| II. Minimal API Footprint | Feature introduces zero new external API calls. | PASS — no network calls in scope at all. |
| III. Maintainability & Simplicity | Plain HTML/CSS/JS, no framework, no build step; lives in its own new sibling file trio rather than growing `collection.js`/`collection.html`, consistent with the one-page-per-workflow precedent already set. | PASS — see Project Structure below. |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/002-progression-pack-tracker/
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
index.html         # existing — proxy-sheet builder page (untouched by this feature)
app.js             # existing — proxy-sheet builder logic (untouched by this feature)
style.css          # existing — proxy-sheet builder styles (untouched by this feature)

collection.html    # existing — Draft Collection Manager page (gets one new nav link only)
collection.js      # existing — backlog/engine/deck logic (untouched otherwise)
collection.css     # existing — collection manager styles (untouched)

tracker.html       # NEW — Progression Series Pack Puller page (trackers UI)
tracker.js         # NEW — all logic: persistence (shared blob), trackers, pulls, progress
tracker.css        # NEW — styles for the tracker page
```

**Structure Decision**: Following the precedent set by the Draft Collection Manager feature
(Constitution Principle III), this feature is added as its own sibling page/script/stylesheet
trio rather than being merged into `collection.html`/`collection.js`. Two reasons specific to
this feature, beyond the general "one page per workflow" rule: (1) `collection.html`'s 3-column
fixed-height layout was deliberately tuned (across several iterations) to keep exactly Backlog /
Engines / Decks simultaneously visible without page scroll — adding a 4th column would either
re-cramp that layout or force a redesign neither asked for nor needed; (2) pack-pulling is a
distinct enough workflow (logging real-world pack-opening events) from backlog/engine/deck
management that it earns its own page, the same way proxy-sheet-building earned its own page
from backlog management. `tracker.js` reads and writes the same shared `localStorage` blob as
`collection.js` (see Technical Context) purely as data — the two pages still share no runtime
code or build tooling. `collection.html` gets one additive nav link to `tracker.html` (and vice
versa), mirroring the existing `index.html` ↔ `collection.html` cross-link.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` specifies a confirmation prompt before deleting a tracker; checklist/outstanding-cards views are always visible (no hidden state needed to answer "how am I doing"); every planned icon-only control (expand/collapse, remove) is specified with its `aria-label` text up front. |
| II. Minimal API Footprint | PASS | No network calls anywhere in the design. |
| III. Maintainability & Simplicity | PASS | One new entity family (Tracker → checklist + pulls) with completion progress computed from raw pull history rather than stored as a separate synced flag — same "derive, don't duplicate" approach `collection.js` already uses for allocation counts. |

No new violations introduced by the Phase 1 design.
