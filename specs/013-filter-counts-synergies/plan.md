# Implementation Plan: Filter Counts & Synergy Tab

**Branch**: `013-filter-counts-synergies` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-filter-counts-synergies/spec.md`

## Summary

Two additions to the Backlog filter window built in feature 012:

1. **Counts**: every value chip (level/rank/link rating/scale, attribute, race, Spell and Trap sub-type) and the Monster tab's "Include normal / Include effect" boxes show how many distinct Backlog cards have that value. Counts are fixed (they describe the whole tab, not the current draft). A pure helper computes the counts in one pass over the cards; the window prints them in the chip text and the accessible name.
2. **Synergy tab**: a tenth, cross-type tab. A pure helper extracts the names written between double quotes in every card's effect text, de-duplicates them case-insensitively and ties each name to the cards that quote it or whose own name contains it. The tab lists the names (highest count first) with a search box. The selection is stored in the same per-profile filter record (`synergy` list), combines with OR inside the tab and with AND with the type tabs, and is cleared by the existing Clear action. Cards missing effect text are completed in the background (already batched and once per card).

All rules stay pure and testable in the filter module; the UI changes are confined to the filter window and the filter icon state.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses the existing batched `completeMissingCardDetails` (YGOPRODeck `cardinfo.php` by id)

**Storage**: `localStorage` via `saveData`/`loadData`: the existing per-profile key `ygoBacklogFilter` gains an optional `synergy: [string]` field; an older record without it loads as "no synergy restriction"; the profile save file mirrors it automatically

**Testing**: Pure logic (quote extraction, ties, counts, matching, persistence, sanitize) added to `shared/contract-tests.js` (run by `shared/profiles.test.js` and `shared/tests.html`); UI checked with `quickstart.md`

**Target Platform**: Modern desktop/mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: Building counts and the synergy index for 2,000 cards under 1 s; applying a synergy selection under 1 s

**Constraints**: No new API calls beyond the existing once-per-card completion; the index is computed when the window opens (and after completion), never per keystroke; no change to quantities, rarity data or drag-and-drop

**Scale/Scope**: Backlogs of a few thousand cards; up to a few thousand distinct quoted names

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Counts make values informative; the synergy list has a search box, highest counts first, keyboard-operable tab and checkboxes, accessible names include counts; same Apply/Cancel/Clear semantics as the rest of the window. |
| II. Minimal API Footprint | Pass. No new requests: missing effect text is completed through the existing batched, once-per-card routine; index computed in memory. |
| III. Maintainability & Simplicity | Pass. Extends the existing pure module and window; one small new file for the synergy rules keeps the filter module readable; no new abstractions or dependencies. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/013-filter-counts-synergies/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── synergy-filter-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── backlog-synergy.js        # NEW: pure rules: quoted-name extraction, synergy index, ties
├── backlog-filter.js         # synergy field in filter, matching, sanitize, active state, value counts
├── backlog-filter-modal.js   # counts in chips/boxes, Synergy tab (list + search), active tab handling
├── backlog-filter.css        # count and synergy list styling
├── backlog-panel.js          # icon count includes the synergy selection (uses activeFilterCount)
└── contract-tests.js         # new checks
collection/
└── collection-backfill.js    # also complete cards that lack effect text
workshop/
└── backlog.html, synergy.html, deckbuilding.html  # script tag for backlog-synergy.js before backlog-filter.js
```

**Structure Decision**: Single static project; the feature extends the shared Backlog filter modules from feature 012 and adds one pure module.

## Complexity Tracking

No constitution violations.
