# Implementation Plan: Booster Pull Review

**Branch**: `005-booster-pull-review` | **Date**: 2026-10-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-booster-pull-review/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Inserts a review step between drawing a simulated booster pull and committing it: instead of
`tracker.js`'s "Simulate pull" immediately adding drawn cards to the backlog and logging the pull,
the draw is held as a **pending pull** — shown as a list of compact minicards (one per pulled
card) — until the user chooses **Save** (commit exactly as today's immediate behavior already
does), **Reattempt** (discard the draw and immediately redraw with the same set and pack count,
replacing the pending pull in place), or **Discard** (abandon it, nothing recorded). Clicking a
minicard opens a detail view (image, and for Monsters, level/ATK/DEF) sourced from the same
card-pool lookup `fetchSetCardPool` already performs — no new network call. Implemented entirely
within `tracker.js`/`.html`/`.css`; no other page is touched.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), HTML5, CSS3 — no transpilation or build step.

**Primary Dependencies**: None beyond the browser's built-in `fetch`, already used by
`fetchSetCardPool`. No new dependency.

**Storage**: No new persisted entity. A pending pull is **session-only** state (a `Map` keyed by
tracker id, mirroring the existing `setCardPoolCache`/`expandedTrackers` pattern already used for
session-only UI state in `tracker.js`) — never written to the shared `localStorage` blob. Saving a
pending pull writes to the backlog and a tracker's `pulls` array exactly as today's immediate-log
path already does (unchanged `OwnedCard`/`Pull` shapes).

**Testing**: No automated test suite (project has none). Manual verification in-browser against
the scenarios in `quickstart.md`.

**Target Platform**: Modern desktop and mobile web browsers (same support target as the other
pages). No new network dependency — this feature adds zero new call shapes.

**Project Type**: Modification to an existing static client-side page (`tracker.html`/`.js`/
`.css`) only — no new pages, no other existing page touched.

**Performance Goals**: Reattempt must feel instant — `fetchSetCardPool`'s result is already cached
per set (`setCardPoolCache`), so a reattempted draw never re-fetches and completes synchronously
from the user's perspective, satisfying SC-003.

**Constraints**: No backend, no build pipeline; this feature must not introduce any additional
network call shape (FR-008) — the richer per-card detail minicards need is extracted from the
*same* `cardinfo.php?cardset=` response `fetchSetCardPool` already parses, just capturing more of
its fields than today's `{name, weight}` shape does; a tracker may have at most one pending pull
at a time (FR-007); minicards and the Save/Reattempt/Discard controls must be keyboard-operable
(Constitution Principle I).

**Scale/Scope**: Same scale as the existing Set Pack Simulator (a handful of trackers, low tens of
packs per simulated pull) — a pending pull's minicard list is the same order of magnitude as a
single pull's card count (≤ CARDS_PER_PACK × a small pack count), well within a wrapping flex
layout with no pagination needed.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. Usability First | Save/Reattempt/Discard and each minicard are native, keyboard-operable `<button>`s (per this project's repeated lesson on this exact point); the review step itself is immediate, visible feedback that a pull happened, before anything is committed. Discard/Reattempt need no extra confirmation modal — they act only on a not-yet-persisted draft, which is not a "destructive action" over saved data in the sense Principle I's confirmation rule targets (nothing committed is ever lost); that reasoning is recorded here precisely so it isn't re-litigated as a gap later. | PASS |
| II. Minimal API Footprint | Zero new network call shapes: the minicard detail fields are extracted from the exact same cached `fetchSetCardPool` response already fetched for the weighted draw; Reattempt reuses that same cache, so repeated reattempts cost no additional calls at all. | PASS — strictly fewer/equal calls than today. |
| III. Maintainability & Simplicity | One small, independent addition to `tracker.js`: a per-tracker pending-pull state map, a minicard renderer, and a detail-modal opener, all reusing the existing `showModal` already established there (feature 004) — no new cross-page sharing, no new dependency. | PASS |

No violations identified; Complexity Tracking table is not needed.

*Post-Phase-1 re-check*: see end of this document.

## Project Structure

### Documentation (this feature)

```text
specs/005-booster-pull-review/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── checklists/
    └── requirements.md  # Spec quality checklist (/speckit-specify command)
```

No `contracts/` directory: this feature calls an existing external API as a client but exposes no
interface of its own, and introduces no new call shape at all — same as prior features.

### Source Code (repository root)

```text
index.html, app.js, style.css           # existing — untouched
collection.html, collection.js, collection.css  # existing — untouched

tracker.html    # MODIFIED — pending-pull-review markup (minicard list + action buttons)
tracker.js      # MODIFIED — pending-pull state, draw/save/reattempt/discard logic, minicard
                #            rendering, detail-modal opener
tracker.css     # MODIFIED — minicard, pending-pull-review, and modal-image styles
```

**Structure Decision**: This feature changes *how* the Set Pack Simulator's existing "Simulate
pull" control behaves — it doesn't introduce a new workflow or page, consistent with how the Set
Pack Simulator (003) and Card Tag Interactions (004) features each extended an existing page
rather than adding one. All work stays inside `tracker.js`/`.html`/`.css`; `collection.html`/`.js`/
`.css` are untouched since nothing about the backlog, engines, or decks changes.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No entries — no Constitution Check violations were identified for this feature.

## Post-Phase-1 Constitution Re-check

Re-evaluated after completing `research.md` and `data-model.md`:

| Principle | Status | Notes |
|---|---|---|
| I. Usability First | PASS | `data-model.md` specifies native-button minicards and action controls, and the no-confirmation-needed reasoning for Discard/Reattempt is unchanged by design work. |
| II. Minimal API Footprint | PASS | `research.md` confirms the detail fields ride along on the already-fetched, already-cached pool response — literally zero new requests, even under repeated Reattempts. |
| III. Maintainability & Simplicity | PASS | One cohesive, independent addition to `tracker.js`, reusing its own existing `showModal`; no shared runtime code introduced with `collection.js`. |

No new violations introduced by the Phase 1 design.
