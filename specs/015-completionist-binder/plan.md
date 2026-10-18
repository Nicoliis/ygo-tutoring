# Implementation Plan: Completionist Binder

**Branch**: `015-completionist-binder` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/015-completionist-binder/spec.md`

## Summary

A new Workshop page, **Completionist Binder**, where the user picks one set and sees every printing of it as a binder slot (one slot per card per rarity, in set-number order): owned printings in colour with their rarity glow, missing ones greyed out, every slot with its rarity tag, and a progress line ("142 of 380 owned · 37%").

- **Pure rules** in a new `shared/set-slots.js` (testable in Node): build the slots of a set from the card database's answer, match the user's recorded printings to slots (card + set + rarity, and the set number when it was recorded), compute completion and the count of copies that cannot be matched.
- **Data**: the set's cards come from the same single request the pack generator already uses (`cardinfo.php?cardset=…`). That fetch is split so the raw answer is cached once and reused by both the pack pool and the binder (Constitution II); a set is requested only when chosen, once per session.
- **Layout and paging are reused from feature 014**: the paging module is unchanged, and the Backlog binder's controller is extracted into a small reusable binder controller (`collection/binder-controller.js`) that both the Backlog and the completionist binder use, instead of copying it.
- **Rendering separated from behaviour**: new views live in `workshop/views/` (set chooser/progress/notes view and the completionist slot view); state and wiring stay in `workshop/`.
- **Available sets**: Progression Run profile → the reached boosters (the Store's rule, `reachedBoosters`, moved into `progression/progression-state.js` so both pages share it); Sandbox profile → every mainline booster; most recent first.
- Read-only: nothing is saved, sold or edited from this page.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses `fetchSetCardPool`'s request (refactored for sharing), `buildRarityBadge`/`applyRarityGlow` (rarity.js), `openCardDetailModal`, the 014 paging module and binder view, `MAINLINE_BOOSTERS`, `loadRun`/`newRun`, `loadCollection`

**Storage**: None new. The page reads the active profile's saved collection and run; nothing is written. The set card list is cached in memory for the session only

**Testing**: Pure rules (slot building and order, multi-rarity, ownership matching, completion, unmatched count) added to `shared/contract-tests.js` (run by `shared/profiles.test.js` and `shared/tests.html`); UI checked with `quickstart.md`

**Target Platform**: Modern desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: First pages of a set shown under 3 s after choosing it on a normal connection; page turn under 0.5 s; building slots and ownership for a 600-printing set under 100 ms

**Constraints**: One card-list request per chosen set per session (reusing the pack pool's request and cache); pictures only for the pages in view; no new storage; keyboard operable; owned/missing never by colour alone

**Scale/Scope**: Sets of up to a few hundred cards (some of 600+ printings); backlogs of a few thousand cards

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Progress line and slot states are visible without instructions; every state also has text (accessible name with rarity and owned/missing, "Missing" label); loading and error states give feedback with a retry; page controls and chooser are keyboard operable. |
| II. Minimal API Footprint | Pass. One request per chosen set, only on demand, cached in memory and shared with the pack generator's pool (no duplicate fetch of the same set); no prefetching of other sets; pictures only for visible pages. |
| III. Maintainability & Simplicity | Pass. Pure rules in one small module; the 014 binder controller is extracted and reused rather than duplicated; views in their own folder; `reachedBoosters` moves to the module that owns the run instead of being copied. No new dependency. |
| Additional Constraints (local only) | Pass. No new storage, nothing transmitted beyond the existing card-database requests. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/015-completionist-binder/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── completionist-binder-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── set-slots.js              # NEW: pure rules: build slots, match ownership, completion, unmatched count
├── pack-pool.js              # fetchSetApiCards(setName): shared raw fetch + cache; fetchSetCardPool uses it
├── areas.js                  # Workshop gets the "Completionist Binder" page
└── contract-tests.js         # new checks
collection/
├── binder-controller.js      # NEW: createBinder({ container, buildSlot }) -> { render, reset }: offset, narrow media, turn handlers
├── collection-binder-state.js# Backlog now uses the controller (same behaviour)
progression/
└── progression-state.js      # reachedBoosters(run, list) moved here from the Store
store/
└── store-state.js            # reachedBoosters removed (now in progression-state.js)
workshop/
├── completionist.html        # NEW page
├── workshop-completionist-init.js   # NEW: page start, set chooser wiring, loading/error/retry, refresh on show
├── completionist-state.js    # NEW: available sets, loadSetSlots (fetch + build), owned map, progress
└── views/                    # NEW folder: rendering only
    ├── completionist-view.js # chooser, progress line, notes, loading/error/empty states
    ├── completionist-slot-view.js # owned (colour, glow, ×N) / missing (grey, "Missing"), rarity tag
    └── completionist.css     # layout, grey treatment, tag position
```

**Structure Decision**: Single static project. Pure logic in `shared/` so it is tested in Node like the filter, store and paging rules; the 014 paging module and binder view are reused unchanged; one small extraction (`binder-controller.js`) removes the need to copy the Backlog's binder state; all new DOM building is under `workshop/views/`.

## Complexity Tracking

No constitution violations.
