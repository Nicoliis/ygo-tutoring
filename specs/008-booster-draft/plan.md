# Implementation Plan: Booster Draft

**Branch**: `008-booster-draft` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-booster-draft/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Add a fourth tool page, "Booster Draft," reachable from the existing shared sidebar. Users pick a
set, an amount of boosters, a cardpool (pick-group) size, and a grouping criterion (rarity or
approximate price), then draft one card at a time from successive same-tier groups of cards drawn
from simulated booster openings, finally merging their picks into the existing backlog. The
simulation reuses the exact weighted-draw/caching approach already built for the Progression
Series Pack Puller's set pack simulator (`tracker.js`), extended with: a per-set booster-size
lookup (since booster size is no longer assumed to be a universal constant), and a new
approximate-price field extracted from the card API for the price grouping option.

## Technical Context

**Language/Version**: HTML5, vanilla JavaScript (ES2017+, IIFE module pattern matching the
existing `app.js`/`collection.js`/`tracker.js`/`nav.js`), CSS3

**Primary Dependencies**: None — no framework or library; same YGOPRODeck v7 REST API
(`db.ygoprodeck.com/api/v7/`) already used by `app.js`/`tracker.js`/`collection.js`

**Storage**: Browser `localStorage` — reads/writes the existing `ygoCollection` key (the backlog)
using the same merge-by-name shape already established by `collection.js`'s
`addOrIncrementCardFromSearchResult`; no new persisted key is required (an in-progress draft is
explicitly session-only per spec.md Assumptions)

**Testing**: Manual browser verification (no automated test suite exists in this project)

**Target Platform**: Modern desktop and mobile browsers, served as static files (same as existing pages)

**Project Type**: Static multi-page client-side web app (flat file structure at repo root)

**Performance Goals**: Drawing `amount` boosters (`amount × booster size` cards) and forming pick
groups completes without a perceptible UI stall for realistic amounts (tens of boosters); no more
than one network fetch per distinct set per session, matching the existing simulator's caching
discipline (Constitution Principle II)

**Constraints**: No build step; must reuse `tracker.js`'s established API-shape, caching, and
weighted-draw conventions rather than inventing a parallel approach; must not duplicate the entire
Progression Series Pack Puller page, only its drafting primitives; must integrate with the shared
sidebar from `007-sidebar-navigation` (`nav.js`'s `NAV_ENTRIES` list) rather than re-introducing
page-specific nav links

**Scale/Scope**: 1 new HTML page, 1 new CSS file, 1 new JS file; a small addition to the existing
shared `nav.js` navigation list; no changes to `app.js`/`collection.js`/`tracker.js` internals
(each remains independently self-contained per the existing per-page module pattern)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Usability First** — PASS. The amount/cardpool fields give immediate, visible feedback (the
  live kept/total calculation, FR-006); invalid amount/cardpool/no-booster-selected states are
  prevented from starting a draft with a clear reason (FR-003, FR-004, FR-016); abandoning an
  in-progress draft is a destructive action and MUST require explicit confirmation (FR-017),
  consistent with the existing "Clear deck" confirmation pattern in `app.js`.
- **II. Minimal API Footprint** — PASS. Reuses `tracker.js`'s existing once-per-session,
  cached-by-set-name fetch pattern (`cardsets.php` once, `cardinfo.php?cardset=` once per distinct
  set) rather than introducing new polling or per-pick network calls; all pick-group formation and
  card drawing happens against the already-fetched, in-memory pool.
- **III. Maintainability & Simplicity** — PASS. The new page follows the exact same
  self-contained-IIFE-per-page structure as every existing tool page; the weighted-draw and
  set-pool-fetch logic is **reused conceptually** (same approach, same API shape) rather than
  copy-pasted wholesale — `draft.js` implements its own small, focused versions of these functions
  scoped to its own page, exactly as `collection.js` and `tracker.js` already each maintain their
  own independent copies of similar helpers (e.g. `extractCardDataFromApiResult`) rather than
  sharing a library module. No new dependency, framework, or build step is introduced.

No violations identified; Complexity Tracking is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/008-booster-draft/
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
index.html           # Proxy Sheet Builder page — unchanged
collection.html       # Draft Collection Manager page — unchanged
tracker.html          # Progression Series Pack Puller page — unchanged
style.css / app.js
collection.css / collection.js
tracker.css / tracker.js
nav.css               # Shared sidebar styles (007-sidebar-navigation) — unchanged
nav.js                # Shared sidebar script (007-sidebar-navigation) — UPDATED:
                       #   NAV_ENTRIES gains a 4th entry for draft.html

draft.html            # NEW — Booster Draft page (config fields + draft area)
draft.css             # NEW — Booster Draft page styles
draft-data.js         # NEW — isolated reusable data only: MAINLINE_BOOSTERS,
                       #   BOOSTER_SIZE_OVERRIDES/DEFAULT_BOOSTER_SIZE,
                       #   RARITY_GLOW_TIERS/DEFAULT_RARITY_GLOW. No behavior.
draft-grouping.js     # NEW — isolated pick-group formation algorithms: sortValueFor,
                       #   shuffleArray, dedupeChunks, buildPickGroupsForBooster.
                       #   Pure functions, no DOM access.
draft-modal.js        # NEW — isolated card detail modal: generic showModal/escapeHtml
                       #   dialog engine plus buildCardTags/buildEffectHtml/
                       #   openPickCardDetailModal. Depends on #modalRoot existing in
                       #   the page; the "Keep This Card" action is an onKeep callback
                       #   supplied by the caller, not a direct session dependency.
draft.js              # NEW — Booster Draft page orchestration: set-pool fetch/cache
                       #   (reusing tracker.js's approach), per-set booster-size
                       #   lookup, weighted draw, session/pick-queue state, event
                       #   wiring, backlog merge-on-finish. Calls into the three
                       #   files above (all loaded before it) rather than owning
                       #   their logic directly.
```

**Structure Decision**: Single flat static-site structure (already in use). The feature adds one
new page (`draft.html`/`draft.css`/`draft.js`), following exactly the same self-contained,
one-page-per-tool pattern as the three existing tools, and extends the shared `nav.js` navigation
list (introduced in `007-sidebar-navigation`) with a fourth entry so the new page is reachable from
every other page's sidebar. No existing page-specific CSS/JS file's internals are restructured.

## Complexity Tracking

*No Constitution Check violations — this section is not applicable.*
