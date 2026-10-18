# Implementation Plan: Engines Panel in the Card Details Window

**Branch**: `016-card-detail-engines` | **Date**: 2026-10-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-card-detail-engines/spec.md`

## Summary

Every card details window gets a second column, the **engines panel**: the profile's engines with this card's count in each, add/remove one copy, and a "new engine" field that creates the engine already holding the card. It works on every screen that opens card details, including while pulling packs and picking in the draft.

- **One details window, two columns**: both existing `openCardDetailModal` versions (shared and Workshop) build the same two-column body through one new helper, `showCardDetailWindow`, so the panel is mounted in exactly one place. Narrow windows stack the panel below the details.
- **Engine rules are pure and shared** (`shared/engine-rules.js`, testable in Node): list engines, count a card in an engine, check and apply add/remove, create an engine with a card. The limit is the Workshop's: an engine holds at most the copies owned, never more than 3 (`maxAllowedInGroup`).
- **Storage-based, so it works everywhere**: most pages do not load the Workshop's in-memory collection. The panel reads and writes the profile's saved collection directly, then calls a per-page refresh hook (`onCardEnginesChanged`) so pages that keep the collection in memory (Workshop, Store sell, Tracker) reload it and are never left with a stale copy that would overwrite the change on their next save.
- **Owned card resolution**: the card shown may be a collection card, a pulled card or a database card, so the panel finds the owned card by id, then `apiId`, then name. A card that is not owned shows the panel read-only.
- **Early save for pulls and draft picks (clarified)**: adding a pulled or picked copy to an engine first saves that one copy to the Backlog, and marks it `savedEarly` in the pack (or the draft pick), so finishing the pack or the draft skips it. The marking is part of the run (so it survives closing the page); a failed marking undoes the early save so no copy is ever duplicated or lost.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses `showModal`, `mergeCardsIntoBacklog`, `maxAllowedInGroup`, `loadData`/`saveData`/`profileKey`, `finishPack`/`finishExtraPack`, the run persistence of the Progression page and the draft session

**Storage**: The active profile's saved collection (`engines` list, already persisted) and, for early saves, a boolean `savedEarly` on pulled cards inside the saved run's pack; no new keys

**Testing**: Pure engine rules, the early-save marking and the "skip saved-early cards at finish" rule added to `shared/contract-tests.js` (run by `shared/profiles.test.js` and `shared/tests.html`); UI checked with `quickstart.md`

**Target Platform**: Modern desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: Count shown within 0.5 s of an add/remove; panel with 200 engines opens without lag

**Constraints**: No API calls; no change to deck behaviour, balance or pack contents; never save a pulled copy twice; a failed save must not show as done; keyboard operable, announced changes

**Scale/Scope**: Dozens of engines per profile; nine screens open the details window

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Engines are one click from any card; refusals always give the reason; every control has an accessible name and a live-region announcement; the name field gives feedback; no destructive action (removing a copy from an engine is undoable by adding it back, and never touches the Backlog). |
| II. Minimal API Footprint | Pass. No network requests at all. |
| III. Maintainability & Simplicity | Pass. One helper builds the two-column window for both existing modal functions; pure rules in one small module (reusing the Workshop's limit instead of copying it); the panel's drawing lives in its own views folder; the refresh hook is one optional function per page. No new dependency. |
| Additional Constraints (local only) | Pass. Only local storage is used. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/016-card-detail-engines/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── engines-panel-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── engine-rules.js           # NEW: pure rules over a collection blob (list, count, canAdd, add, remove, createWithCard, resolveOwnedCard)
├── card-engines.js           # NEW: behaviour: reads/writes the saved collection, early save of pulled/picked copies, hooks, announcements
├── card-detail-window.js     # NEW: showCardDetailWindow({ card, title, detailHtml, buttons, pull }) builds the two columns, mounts the panel
├── card-detail-modal.js      # uses showCardDetailWindow (keeps extraHtml); signature gains the pull context
├── pack-reveal.js            # passes the pull context when a pulled card is opened
├── backlog-merge.js          # mergeCardsIntoBacklog skips cards flagged savedEarly
└── views/                    # NEW folder: rendering only
    ├── card-engines-view.js  # panel markup: list, counts, add/remove, search, new-engine form, notes, live region
    └── card-engines.css      # two-column layout, panel styling, narrow-window stacking
collection/
└── collection-card-detail-modal.js   # uses showCardDetailWindow
progression/
├── progression-state.js      # markCardSavedEarly(run, source, card); finishPack / finishExtraPack skip savedEarly cards
└── progression-init.js       # pull context provider (early save + run persistence), refresh hook not needed
draft/
├── draft-pick-handling.js, draft-backlog-merge.js, draft-render-pick-group.js   # pick context; final merge skips savedEarly picks
store/store-sell.js, tracker/*.js, workshop/*.js   # page refresh hook `onCardEnginesChanged` (reload the in-memory collection and redraw)
workshop/completionist.html, store/*.html, progression/index.html, draft/index.html, tracker/index.html, workshop/*.html   # script/link tags
```

**Structure Decision**: Single static project. Pure logic in `shared/engine-rules.js` (Node-testable), behaviour in `shared/card-engines.js`, all panel DOM in `shared/views/`. One window helper replaces the two direct `showModal` calls so the panel appears wherever details open, with no per-screen UI code.

## Complexity Tracking

No constitution violations.
