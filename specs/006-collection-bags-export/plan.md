# Implementation Plan: Collection Bags & Deck Export

**Branch**: `006-collection-bags-export` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-collection-bags-export/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Three related changes to the Draft Collection Manager, all scoped to `collection.html`/`.js`/
`.css`: (1) backlog cards that predate the search-based add flow get their image/type/stats/effect
backfilled lazily, on first hover or click, via the same card-database lookup already used
elsewhere — fixing what reads as a broken image/detail view today; (2) engines become simple,
clickable bags (collapsed = name only, click to expand/collapse, composition managed purely by
dragging cards in and dragging them onto a bin to remove — no more checkbox-based bulk editor,
Edit becomes rename-only); (3) decks become the same kind of bag, split into Main Deck and Extra
Deck sections, dropping an engine onto either section expands it into plain card entries
immediately (decks never track an engine as a live reference), and decks gain Export (to the
standard YDK file format, copied to the clipboard and downloadable) and Import (from that same
format, matching only against cards already in the backlog, replacing the target deck's contents).

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None beyond the browser's built-in `fetch`, already used throughout this
page — the backfill lookup (Story 1) reuses the exact same endpoint and extraction helper the
search-and-select flow already calls.

**Storage**: Extends `OwnedCard` with an `effect` (description text) field, populated the same way
as its existing looked-up fields. Restructures `Deck` from one flat `items` array (cards and/or
engine references) to two plain arrays, `main` and `extra`, each holding only `{cardId, quantity}`
entries — engines are never stored as a deck entry. A one-time, in-place migration on load converts
any existing deck's old `items` shape into `main`/`extra` (resolving any engine-type old items into
plain cards using that engine's current composition, per spec Edge Cases).

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`, plus live-API verification of the backfill lookup and a
round-trip YDK export→import check.

**Target Platform**: Modern desktop and mobile web browsers (same support target as the other
pages). No new network call *shape* — the backfill lookup (Story 1) is the same lookup pattern
already established, just triggered differently (lazily, per-card, on first view) instead of only
at explicit add-time.

**Project Type**: Substantial modification to an existing static client-side page
(`collection.html`/`.js`/`.css`) — no new pages, no other existing page touched.

**Performance Goals**: The backfill lookup must never fire more than once per card per page load
(a `Set` of already-attempted card ids enforces this, mirroring the dedup already used for stale
search requests). Expand/collapse must feel instant (pure local state + re-render, no network).

**Constraints**: No backend, no build pipeline; the backfill lookup MUST NOT be triggered eagerly
for the whole backlog at once (only per-card, on that card's first hover/click) — Constitution
Principle II; YDK Import MUST NOT introduce a new network call (FR-016) — it only matches against
cards already in the backlog; every drag-based action (add-to-bag, remove-via-bin) MUST keep a
non-drag, keyboard-operable equivalent — Constitution Principle I.

**Scale/Scope**: Same backlog/engine/deck scale as before (low hundreds of cards, several
engines/decks) — the Main/Extra split and drag-to-bin removal are purely presentational/structural
changes at this scale, no pagination or virtualization needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | Every new drag gesture (drag-to-add, drag-to-bin-to-remove) keeps a non-drag, keyboard-operable equivalent, called out explicitly in data-model.md before any code is written — per this project's repeated lesson on this exact point. The collapse/expand click target and the bin both carry accessible names. Removing a card from a bag (not from the backlog) needs no confirmation modal, since nothing persisted is destroyed — reasoned explicitly in spec.md's Assumptions, distinct from backlog-card removal which still confirms. | PASS |
| II. Minimal API Footprint | The backfill lookup (Story 1) is triggered once per card, only on that card's first view, deduplicated by a session-only `Set` — never eager, never repeated. It reuses the exact same endpoint/extraction helper already in this file. YDK Import introduces zero new network calls (matches the backlog only). | PASS — strictly bounded, no new call shape. |
| III. Maintainability & Simplicity | Removing the checkbox-based engine composition editor nets out to *less* code, not more (one less form, one less picker-rendering function). The Main/Extra restructure replaces one deck-items concept with two parallel, simpler arrays of the same shape, reusing existing helpers (`findCard`, `saveCollection`) rather than inventing new persistence patterns. | PASS |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/006-collection-bags-export/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify command)
```

No `contracts/` directory: this feature calls an existing external API as a client but exposes no
interface of its own, and the YDK format is a plain-text import/export representation, not a
network contract.

### Source Code (repository root)

```text
index.html, app.js, style.css                   # existing — untouched
tracker.html, tracker.js, tracker.css            # existing — untouched

collection.html    # MODIFIED — engine creation form simplified to name-only, deck gains
                   #            Main/Extra sections + Export/Import controls, bin drop-zones
collection.js      # MODIFIED — backfill lookup, bag collapse/expand, drag-to-bin removal,
                   #            deck restructure (main/extra), YDK export/import, engine
                   #            composition via drag only
collection.css     # MODIFIED — bag header/body styles, bin drop-zone, Main/Extra section
                   #            layout, import/export modal content
```

**Structure Decision**: All three stories redesign *how* the Draft Collection Manager's existing
Backlog/Engines/Decks already work — no new workflow, no new page, consistent with every prior
feature that touched this page. `tracker.html`/`.js`/`.css` are untouched since none of these
stories involve the Progression Series Pack Puller.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` specifies the non-drag equivalent for every new drag gesture up front, and the bag collapse/expand toggle is a real, keyboard-reachable control, not a plain `<div onclick>`. |
| II. Minimal API Footprint | PASS | `research.md` confirms the backfill lookup's dedup mechanism and that Import never calls the network. |
| III. Maintainability & Simplicity | PASS | Net reduction in UI surface (no checkbox picker, no separate `type` discriminator on deck items) despite the new Main/Extra split and export/import. |

No new violations introduced by the Phase 1 design.
