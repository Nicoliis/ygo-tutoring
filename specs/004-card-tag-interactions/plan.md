# Implementation Plan: Card Tag Interactions

**Branch**: `004-card-tag-interactions` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-card-tag-interactions/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Redesigns how cards appear throughout the Draft Collection Manager (Backlog, Engine contents,
Deck contents): every card becomes a fixed-size "tag" showing its name, with hover revealing key
details, a first click expanding an inline image, and a second click opening a full-detail modal
— all sourced from the same external card database `app.js` already calls, replacing today's
free-text-only cards. Cards are added to the backlog via search-and-select (mirroring the Proxy
Sheet Builder's existing pattern) rather than typing a name. Dragging a card tag onto an engine
or deck supplements (not replaces) the existing form-based add controls. Every removal — backlog
card, whole engine/deck/tracker, or a single card/item/checklist-entry from inside one — now
shows a custom confirmation modal instead of a browser popup, extended consistently to a few
removal points that have no confirmation at all today. Implemented primarily as substantial
changes to `collection.html`/`collection.js`/`collection.css`, with one small, consistent
addition to `tracker.js`/`tracker.css` (the checklist-entry removal modal, per spec Assumptions).

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None beyond the browser's built-in `fetch` and the native HTML5 Drag
and Drop API (`draggable`, `dragstart`/`dragover`/`drop` events) — no framework, no drag-and-drop
library; matches every other page's dependency-free approach.

**Storage**: Extends the existing `OwnedCard` record (in the shared `localStorage` blob) with the
card-database fields needed for the tag/hover/modal views (image URLs, type, and — for Monsters —
level/ATK/DEF), captured **once, at add-time**, not re-fetched on every render. No new top-level
entity. Cards added before this feature keep their existing shape (name + quantity only) and
render with a graceful "no image available" state — see research.md and data-model.md.

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`, including simulating an unreachable API (per FR-010) and
keyboard/touch-only use (per FR-006/SC-005).

**Target Platform**: Modern desktop and mobile web browsers (same support target as the other
pages). `collection.html` gains a network dependency for the first time (searching/adding a new
card); everything else on that page (viewing/removing existing cards, managing engines/decks,
dragging) continues to work fully offline.

**Project Type**: Substantial modification to an existing static client-side page
(`collection.html`/`.js`/`.css`), plus one small, consistent addition to `tracker.html`/`.js`/
`.css` — no new pages.

**Performance Goals**: Rendering a tag, and expanding it to show its already-fetched image, must
feel instantaneous — no network call happens at render time, only at add-time (research.md).
Drag-and-drop feedback (valid drop-zone highlighting) must be immediate per Constitution
Principle I.

**Constraints**: No backend, no build pipeline; the one new network call shape (card search,
reused from `app.js`'s existing debounced pattern) must not introduce any other call site; a
search/add failure MUST leave the backlog untouched (FR-010); every drag-based action MUST have
the pre-existing non-drag control as its working equivalent (FR-006); modals MUST be reachable
and dismissible via keyboard alone (Constitution Principle I).

**Scale/Scope**: Same backlog/engine/deck scale as the Draft Collection Manager's own plan.md
(low hundreds of cards, 5+ engines/decks) — fixed-size tags in a wrapping flex layout, with
existing list containers' internal scroll, handle this without degradation.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This is the second feature (after the Set Pack Simulator) to reintroduce a network dependency,
this time into `collection.html`, which was previously zero-network — Principle II gets the same
scrutiny here that it got there.

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | Card-detail and removal-confirmation modals are keyboard-reachable and dismissible (focus trapped, Escape closes) from the start — called out explicitly here, not left to a later `/speckit-converge` catch, per the project's repeated lesson on this; drag-and-drop is a supplement, so every action keeps a non-drag, keyboard-operable path; a search/add failure shows a clear message. | PASS — see data-model.md / quickstart.md. |
| II. Minimal API Footprint | One new call shape: card search for the backlog's add flow, reusing `app.js`'s exact existing debounce (400ms) + minimum-length (3 chars) + `AbortController` pattern. Looked-up card data is captured once per added card and persisted — never re-fetched to render a tag, hover, or modal afterward. | PASS — bounded, debounced, cached at the data layer (not just in memory for a session). |
| III. Maintainability & Simplicity | A single shared "render a card tag" helper and a single shared "show a modal" helper are reused across every list (backlog, engine contents, deck contents) and every removal context, rather than duplicating per-list markup/logic; `tracker.js` gets its own small, independent copy of the modal helper, consistent with this project's established "no shared runtime code between pages" rule. | PASS — see Project Structure below. |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/004-card-tag-interactions/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify command)
```

No `contracts/` directory: this feature calls an existing external API as a client but exposes
no interface of its own — same as the Set Pack Simulator feature.

### Source Code (repository root)

```text
index.html         # existing — proxy-sheet builder page (untouched; same API pattern reused)
app.js             # existing — proxy-sheet builder logic (untouched; search pattern reused)
style.css          # existing — proxy-sheet builder styles (untouched by this feature)

collection.html    # MODIFIED — search-based add UI, card-tag containers, modal container
collection.js      # MODIFIED — card search/lookup, tag rendering, drag-and-drop, modals
collection.css     # MODIFIED — card tag, hover/expand, modal, and drag-feedback styles

tracker.html       # MODIFIED — modal container for the checklist-entry removal confirmation
tracker.js         # MODIFIED — adds its own small removal-confirmation modal helper
tracker.css        # MODIFIED — styles for that modal (independent copy, not shared)
```

**Structure Decision**: The bulk of this feature lives in `collection.js`/`.html`/`.css`, since
that's where the Backlog/Engines/Decks lists this feature redesigns already live — no new page,
consistent with how a feature that changes *how* something already on a page behaves (not a new
workflow) has been handled before (the Set Pack Simulator extended `tracker.js` rather than
adding a page). The one `tracker.js` touch is narrowly scoped to the checklist-entry removal
modal (per spec Assumptions, FR-007 explicitly extends there); it gets its **own** copy of the
modal helper rather than a shared file, consistent with this project's established "no shared
runtime code between pages" rule (first stated in the Draft Collection Manager's plan.md, applied
again by the Set Pack Simulator).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` specifies focus-trapped, Escape-dismissible modals and a single page-wide expanded-tag rule (no layout surprises) from the start; every drag action's non-drag equivalent is the control already shipped. |
| II. Minimal API Footprint | PASS | `research.md` pins down one new, debounced, abortable call shape, with looked-up data persisted at add-time so nothing is ever re-fetched to display a tag. |
| III. Maintainability & Simplicity | PASS | One shared tag-rendering helper, one shared modal helper (duplicated once, intentionally, into `tracker.js`) — no per-list bespoke markup. |

No new violations introduced by the Phase 1 design.
