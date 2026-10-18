# Implementation Plan: Progression Screens and Starting Set

**Branch**: `017-progression-screens` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-progression-screens/spec.md`

## Summary

Split the single Progression Run page into three pages of the Run area and let a new run start at a chosen set.

1. **Starting set**: a new profile has no run yet. Screen 1 shows the booster list in its usual look as a chooser; confirming a set creates the run with `startSet`. Sets before it are *skipped* (locked, outside the stage order and count) but their boosters are buyable in the Store. Runs saved before this feature have no `startSet` and behave as if they started at the first set.
2. **Screen 1 – Progression** (`progression/index.html`): summary, current stage and its actions, booster list with states, completed stages. No packs. Starting the box saves and navigates to screen 2.
3. **Screen 2 – Current stage pull** (`progression/stage.html`): the stage box opener (pack, current pack's pulled strip, box progress) and, below it, an always-visible **"See pulled" list** of the whole box that redraws after every reveal, rarest first with identical cards grouped.
4. **Screen 3 – Booster pull** (`progression/boosters.html`): only the loose boosters the user has (amount > 0), as booster tiles (picture, name, ×amount), "Open one", the open loose pack and its pulled list in real time.

The existing one-file behaviour is split by concern: shared run context, one behaviour file per screen, and all DOM building in `progression/views/` (the rendering folder the user asked for), with the booster tile reused by the three screens. Pure rules (start set, reached boosters, stage state, summary, rarity-ordered pulled list) stay in `progression-state.js` and are tested in Node.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses `createPackReveal` and `buildRevealedCardElement` (pack-reveal.js), `groupPulled`-style grouping with `rarityRank`, `generatePack`, `loadSetDates`/`getSetImage`, the existing run persistence and the pull context for early saves

**Storage**: The saved run (`ygoRun_<profile>`) gains an optional `startSet` string; nothing else changes shape. A profile with no run record means "not started"

**Testing**: Pure rules in `shared/contract-tests.js` (`shared/profiles.test.js`, `shared/tests.html`); UI with `quickstart.md`

**Target Platform**: Modern desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: A pulled card shows in the list within 0.5 s; the list of a 216-card box redraws without lag after each reveal

**Constraints**: An open pack (stage or loose) survives page changes and reloads (already saved in the run); only one pack open at a time; no new API calls (pack generation is unchanged); keyboard operable; phone-width usable

**Scale/Scope**: 97 sets in the list, boxes of up to 216 cards, three screens

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. One job per screen; every empty state says what to do and links to the right screen; the starting choice is confirmed and cancellable; actions keep feedback and accessible names; no destructive action beyond the existing confirmed ones. |
| II. Minimal API Footprint | Pass. No new requests: set dates and pictures reuse the existing cached call; packs are generated exactly as before. |
| III. Maintainability & Simplicity | Pass. Replaces a 600-line mixed page with small single-purpose files; the booster tile is one shared view; pure rules stay in the state module. No new dependency. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/017-progression-screens/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── progression-screens-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
progression/
├── index.html                 # screen 1: progression (rewired)
├── stage.html                 # NEW screen 2: current stage pull
├── boosters.html              # NEW screen 3: booster pull
├── progression-state.js       # startSet, reached/skipped/stage state, summary totals; pure rules
├── progression-context.js     # NEW: active profile, current run, persistRun, status line, no-rules, pull context (from progression-init.js)
├── progression-home.js        # NEW behaviour of screen 1: choose start set, start box, complete stage
├── progression-stage.js       # NEW behaviour of screen 2: box opener, pulled list updates (from progression-init.js)
├── progression-boosters-screen.js   # NEW behaviour of screen 3: loose boosters list, open one, loose pack (from progression-init.js)
├── progression-init.js        # REMOVED (split into the files above)
├── progression-render.js      # REMOVED (split into views/)
├── progression-box.js, progression-boosters.js, progression-dom-refs.js   # kept (pack generation, set dates/images, DOM refs)
├── progression.css            # booster tile states (skipped), pulled list, amount badge
└── views/                     # NEW folder: rendering only
    ├── booster-tile-view.js   # one booster: picture or named placeholder, name, state, optional amount/selection
    ├── home-view.js           # summary, stage panel, booster rail, start-set chooser, completed list, run finished
    ├── stage-view.js          # box opener panel, pulled strip, always-visible pulled list, empty/finished states
    └── booster-pull-view.js   # loose booster tiles with amounts, open pack panel, empty state
shared/
├── areas.js                   # Run area lists the three pages
└── contract-tests.js          # new checks
store/store-state.js, workshop/completionist-state.js, shared/profile-picker.js   # unchanged: they call the shared pure rules
```

**Structure Decision**: Single static project. Pure rules grow in `progression-state.js` (already Node-tested); behaviour is one file per screen over a shared context; all DOM building lives in `progression/views/` so that folder can be collapsed, as requested earlier.

## Complexity Tracking

No constitution violations.
