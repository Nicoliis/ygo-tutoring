# Implementation Plan: Backlog Card Tags & Type Filter

**Branch**: `012-backlog-tags-and-filter` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-backlog-tags-and-filter/spec.md`

## Summary

Two changes to the shared Backlog panel (so every Workshop screen gets them):

1. **Tag polish**: Backlog tags become 205 px wide (engines/decks unchanged), a click on a Backlog tag opens the details window directly (the corner-image step is removed for Backlog tags only), and the list gets a slim themed scrollbar.
2. **Type filter**: a filter icon button next to the Backlog search opens a window with nine tabs (Monster, Spell, Trap, Ritual, Fusion, Synchro, Xyz, Pendulum, Link). Each tab has an include checkbox plus per-type value groups built only from values present in the user's cards. The window edits a draft and takes effect with an Apply button. The applied filter is saved per profile and restored everywhere. Cards missing details are completed in the background in a few batched requests.

All filter logic is pure and testable (`shared/backlog-filter.js`); the UI is a small module on top of the existing modal.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Existing YGOPRODeck `cardinfo.php` (batched by `id`) for completing old cards

**Storage**: `localStorage` via `saveData`/`loadData`: one new per-profile key `ygoBacklogFilter` (suffixed with the profile id like the other per-profile keys); collection cards gain optional detail fields already used elsewhere (`race`, `attribute`, `frameType`, `scale`, `linkval`)

**Testing**: Pure logic (classification, available values, matching, persistence) added to `shared/contract-tests.js`, run by `shared/profiles.test.js` and `shared/tests.html`; UI checked through quickstart.md (constitution: no automated UI suite)

**Target Platform**: Modern desktop/mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: Filtering 2,000 cards under 1 s (a single pass over an in-memory array)

**Constraints**: No per-card API calls: missing details are fetched in batches by card id, once per card, and saved; no changes to quantities, rarity data or drag-and-drop; the name search keeps working and combines with the filter

**Scale/Scope**: Backlogs of a few thousand cards

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Keyboard-operable tabbed window (roles, arrow keys, labels), visible active state and count on the icon, clear empty-result message with a "clear filter" action, Apply/Cancel semantics. |
| II. Minimal API Footprint | Pass. Detail completion is batched by id (about 50 cards per request), runs once per card and the result is stored; nothing is fetched when all cards are already complete; no polling. |
| III. Maintainability & Simplicity | Pass. One pure module for the rules, one UI module, existing modal reused; the tag change is a scoped CSS/option change. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/012-backlog-tags-and-filter/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── backlog-filter-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── backlog-filter.js        # NEW (pure + storage): groupOf, valueGroupsFor, availableValues, matchesFilter, load/save/clear
├── backlog-filter-modal.js  # NEW: tabbed filter window (draft state, Apply / Clear / Cancel)
├── backlog-filter.css       # NEW: tabs, value chips, filter button + active badge
└── backlog-panel.js         # CHANGED: filter button beside the search, active state, opens the window

collection/
├── collection-render-backlog.js    # CHANGED: applies the filter, "no match" state with clear action
├── collection-card-tag-click.js    # CHANGED: Backlog tags open the details window on one click
├── collection-render-card-tag.js   # CHANGED: option { directDetails } passed through
├── collection-backfill.js          # CHANGED: batch completion of missing details (by id)
├── collection-card-tag.css         # CHANGED: .backlog-row .card-tag { width: 205px }
└── collection-backlog-list.css     # CHANGED: slim themed scrollbar

workshop/*.html                     # CHANGED: link backlog-filter.css, load the two new scripts
```

**Structure Decision**: Everything lives in `shared/` (panel feature) with small scoped edits in the existing `collection/` modules, so Backlog, Synergy Builder and Deckbuilding stay identical.

## Complexity Tracking

No constitution violations to justify.
