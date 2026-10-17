# Implementation Plan: Game Profiles & Progression Mode

**Branch**: `009-game-profiles-progression` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-game-profiles-progression/spec.md`

## Summary

Add browser-local **profiles**, each owning an isolated copy of the app's data (collection/backlog/decks, proxy deck, tracker data) and a **game mode**. The first mode, **Progression**, walks the existing `MAINLINE_BOOSTERS` list in order: each stage allows one 24-pack box (reusing the draft card-pool/weighted-pick logic) that lands in the profile backlog, then the user manually completes the stage to advance.

Approach: a small `shared/profiles.js` layer resolves every storage key per active profile, so existing tools only change *which key* they read, never their logic. All reads/writes continue to go through `saveData`/`loadData` in [shared/save-utils.js](../../shared/save-utils.js), so export/import cover profiles and runs automatically. The legacy keys (`ygoCollection`, `ygoDeck`) become the "Sandbox" profile's data in place, so no migration copy is needed and nothing can be lost.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Existing YGOPRODeck API (`cardsets.php` for release dates, `cardinfo.php?cardset=` already used by draft)

**Storage**: Browser `localStorage` via `saveData`/`loadData`; new keys all start with `ygo` so `exportAll` includes them

**Testing**: No automated suite for the app (constitution); pure-logic contract test in Node-style script for `profiles.js` key resolution and stage logic, mirroring `shared/save-utils.test.js`; manual quickstart in browser

**Target Platform**: Modern desktop/mobile browsers, static hosting

**Project Type**: Static multi-page web app (one folder per tool)

**Performance Goals**: Profile picker and run resume visible in <1s after load (SC-002); opening a box (24 packs) completes in <3s after the set's card pool is loaded

**Constraints**: Client-side only; no extra API calls beyond one cached `cardsets.php` fetch and the existing per-set card pool fetch; legacy data must stay intact

**Scale/Scope**: ~10 profiles, ~150 stages, collections of a few thousand cards

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Profile picker is the landing page; irreversible actions (open box, advance, delete profile) require confirmation; blocked actions explain why. |
| II. Minimal API Footprint | Pass. Release dates come from one `cardsets.php` call cached in memory/localStorage; card pools reuse the draft's existing cache; no polling or prefetch. |
| III. Maintainability & Simplicity | Pass. No framework; one new shared module + one new tool folder; existing tools change only their storage key line. Mode is a data field with a stage-logic module per mode (no speculative plugin system). |
| Additional Constraints (local only) | Pass. All data remains in `localStorage`. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/009-game-profiles-progression/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── profiles-and-run-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── save-utils.js              # existing, unchanged (contract-protected)
├── profiles.js                # NEW: registry, active profile, key resolver, sandbox migration
├── profiles.test.js           # NEW: pure-logic contract test (Node)
├── tests.html                 # NEW: same contract tests runnable in a browser
├── profile-guard.js           # NEW: redirect to picker when no active profile (loads before dom-refs)
├── profile-switcher.js        # NEW: sidebar "current profile / switch" control
├── backlog-merge.js           # NEW: backlog merge extracted from draft, shared
└── (draft pack pieces)        # fetchSetCardPool, weighted pick, booster size moved here from draft/, UI-free

index.html                     # becomes profile picker + tool grid (welcome.css extended)
welcome.css

progression/                   # NEW tool page for the "Progression Run" mode
├── index.html
├── progression-dom-refs.js
├── progression-state.js       # stage list, current stage, open/advance rules (pure)
├── progression-boosters.js    # release dates lookup (cardsets.php), cached
├── progression-box.js         # open a 24-pack box using draft pool + weighted pick
└── progression-render.js      # overview: completed / current / remaining

collection/collection-dom-refs.js, draft/draft-dom-refs.js,
tracker/tracker-dom-refs.js, proxy-builder/proxy-dom-refs.js   # STORAGE_KEY → profileKey(...)
shared/nav-entries.js          # add Progression entry
```

**Structure Decision**: Keep the one-folder-per-tool layout. Profile logic is shared infrastructure (`shared/`), the game mode UI is its own tool folder. Existing tools are touched only at the single line defining `STORAGE_KEY`.

## Complexity Tracking

No constitution violations to justify.
