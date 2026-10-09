# Implementation Plan: YGO Set Pack Simulator

**Branch**: `003-ygo-set-pack-simulator` | **Date**: 2026-10-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ygo-set-pack-simulator/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

A second, opt-in way to produce a Progression Tracker pull: instead of typing card names, the
user picks a real Yu-Gi-Oh card set (from a chronologically-sorted picker, fetched once from the
same card database `app.js` already uses) and a pack count, and the app draws a rarity-weighted
random sample from that set's real card pool, feeding it through the exact same pull-logging
pipeline `tracker.js` already has (same Backlog effect, same tracker-progress effect). Implemented
as an **addition to the existing `tracker.html`/`tracker.js`/`tracker.css`** — not a new sibling
page — because this is the same user action (logging a pull) via an alternate input source, not
a new workflow; splitting it into another page would force the user to flip between pages to
pick a tracker and run a simulation against it, actively hurting usability for no structural
benefit.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None beyond the browser's built-in `fetch`. No framework, no HTTP
library; matches every other page's dependency-free approach.

**Storage**: No new persisted fields at all. A simulated pull is stored as an ordinary `Pull`
(see the Progression Series Pack Puller's `data-model.md`) — its `cardNames` just happen to be
system-generated instead of user-typed. The only new state is **session-only, in-memory, never
persisted**: a cache of the full chronological set list and a cache of each fetched set's
card/rarity pool (see research.md).

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`, including simulating an unreachable API (per US3).

**Target Platform**: Modern desktop and mobile web browsers (same support target as the other
pages). Unlike the rest of the app, this one feature's actions require network connectivity;
everything else on `tracker.html` (manual pull logging, tracker CRUD, checklist management)
MUST continue to work fully offline even if this feature's network calls fail.

**Project Type**: Addition to an existing static client-side page (no new page/files).

**Performance Goals**: The random-draw computation itself is in-memory and must feel
instantaneous once set data is available; the one variable is network latency for the two
fetches, which MUST be visibly indicated (a loading state) rather than leaving the UI looking
unresponsive — this is the one place in the app where an action can legitimately take more than
an instant, so Constitution Principle I's "visible feedback" gate applies directly to the fetch,
not just the result.

**Constraints**: No backend, no build pipeline; the two network calls described in research.md
MUST be cached per session so opening many packs, or picking a set more than once, never
re-fetches data already retrieved (FR-007); a fetch failure MUST leave the backlog and every
tracker exactly as they were (FR-008, US3) — no partial writes.

**Scale/Scope**: The full card-set list is on the order of low thousands of sets; a single set's
card pool is at most a few hundred cards. Both are trivially small for client-side JSON handling
and in-memory filtering once fetched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

This is the first feature since the Draft Collection Manager to reintroduce network calls, so
Principle II gets the most scrutiny here.

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | The fetch-in-progress state is visibly indicated (not a silent wait); a fetch failure shows a clear, actionable message (US3); every control has a descriptive accessible name from the start (per the lesson from the sibling feature's `/speckit-converge` pass). | PASS — see data-model.md / quickstart.md. |
| II. Minimal API Footprint | Exactly two call shapes: the full set list, fetched once per session and reused for every tracker's set picker; a given set's card pool, fetched once per session per set and reused for every subsequent simulated pull from it. Neither is triggered per-keystroke or on a timer — the existing search/filter over the set list is entirely client-side against already-fetched data, so it needs no debounce at all. | PASS — bounded, cached, user-initiated only; no redundant or speculative calls. |
| III. Maintainability & Simplicity | Added to the existing `tracker.js` rather than a new page, since it's the same `Pull`-producing action via an alternate input, not a new workflow (see Summary); rarity weighting is a simple tier-based random draw, not a full slot-structure simulation, matching the spec's explicit "approximation, not exact odds" framing. | PASS — see Project Structure below. |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/003-ygo-set-pack-simulator/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify command)
```

No `contracts/` directory: this feature calls an existing external API as a client but exposes
no interface of its own to other callers — there is no contract of this project's own to
document (the external API's shape is documented as a technical decision in research.md instead).

### Source Code (repository root)

```text
index.html         # existing — proxy-sheet builder page (untouched by this feature)
app.js             # existing — proxy-sheet builder logic (untouched; same API domain reused)
style.css          # existing — proxy-sheet builder styles (untouched by this feature)

collection.html    # existing — Draft Collection Manager page (untouched by this feature)
collection.js      # existing — backlog/engine/deck logic (untouched by this feature)
collection.css     # existing — collection manager styles (untouched by this feature)

tracker.html       # MODIFIED — adds a set-picker section + a per-tracker "simulate" control
tracker.js         # MODIFIED — adds set/card-pool fetching+caching and the weighted-draw logic
tracker.css        # MODIFIED — styles for the set picker and the simulate control
```

**Structure Decision**: Unlike the Draft Collection Manager → Progression Series Pack Puller
jump (two genuinely different workflows, so two sibling pages), this feature is **not** a new
workflow — it is a second way to produce the exact same thing `tracker.js` already produces (a
`Pull`), just sourced from a random real-set draw instead of typed text. Splitting it into a 4th
page would force the user to pick a tracker on one page and run a simulation meant for that
tracker on another, which is worse usability for no structural gain (Constitution Principle I
outweighs the one-page-per-workflow default here). Concretely:

- A new, page-level, collapsed-by-default **set picker** section (mirroring the Engine-creation
  form's collapse pattern from `collection.js`) lets the user search/browse the chronologically
  sorted set list and pick one; the currently selected set is shown as a small, always-visible
  badge once chosen.
- Each tracker's existing pull-logging area gets one additional, compact control next to the
  manual textarea: a pack-count input + a "Simulate pull" button, which uses whichever set is
  currently selected page-wide. It's disabled (with a hint) until a set has been picked.

This keeps every individual tracker row exactly as uncluttered as it already was — the set
browser lives in one shared place, not duplicated per tracker.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` specifies an explicit loading state during both fetches and a non-blocking, clear error message on failure; the simulate control is disabled with a hint rather than silently failing when no set is selected. |
| II. Minimal API Footprint | PASS | `research.md` pins down exactly two cached, user-initiated call shapes — no polling, no per-keystroke calls, no background refresh. |
| III. Maintainability & Simplicity | PASS | No new entity, no new persisted schema, no new page; the weighted-draw logic is a small, self-contained function with a documented, intentionally-approximate model. |

No new violations introduced by the Phase 1 design.
