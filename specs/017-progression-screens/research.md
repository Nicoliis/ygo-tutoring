# Research: Progression Screens and Starting Set

## 1. Where the starting set lives
- **Decision**: An optional `startSet` field on the saved run. `newRun(boosterList, startSet)` sets `current = startSet` (default: the first set) and records `startSet`. A profile with no run record is "not started".
- **Rationale**: One new optional field keeps old runs valid (no `startSet` = the first set), and "not started" needs no flag: the absence of the record is the state.
- **Alternatives**: Store the start index (breaks if the booster list gains sets); pre-fill `completed` with the earlier sets (rejected in clarification).

## 2. Earlier sets: locked but buyable
- **Decision**: With start index `i`, sets `0..i-1` have state `"skipped"` (a new `stageState` value, shown locked), are not in the stage count, and are included by `reachedBoosters` so the Store offers them. `runSummary` shows `Stage n/(total − i)`.
- **Rationale**: Exactly the clarified rule; the Store and the completionist binder already call `reachedBoosters`, so they follow without changes.
- **Alternatives**: Treating earlier sets as completed (rejected).

## 3. Not-started runs elsewhere
- **Decision**: Pages that do `loadRun(id) || newRun(list)` (Store, completionist, profile picker) keep working: a not-started profile looks like a run at the first set, and every later start choice keeps that set available (it is the start set or before it).
- **Rationale**: No change needed outside the Progression pages; the picker still prints a summary.
- **Alternatives**: A "not started" summary text (extra surface for no gain; may be added later).

## 4. Starting the run
- **Decision**: Screen 1 draws the booster list as a chooser when `loadRun` is null: each booster tile is a button; selecting one marks it, "Start here" asks for confirmation, then saves `newRun(list, name)` and redraws screen 1 as a started run.
- **Rationale**: Same visual as the progression rail (spec FR-001), one confirmation, nothing saved until confirmed (FR-002).
- **Alternatives**: A separate setup page (one more page to maintain).

## 5. Splitting the page
- **Decision**: Three HTML pages sharing the same script base; each has its own behaviour file; the shared state (active profile, current run, `persistRun`, status, pull context) moves to `progression-context.js`; `progression-init.js` and `progression-render.js` are removed once their parts are moved.
- **Rationale**: One job per file; every page is a plain page with no router; links in the sidebar (areas.js) and on screen 1 move between them.
- **Alternatives**: One page with tabs (the request asks for screens; separate pages keep the url per screen and reload-safe state).

## 6. Real-time "See pulled"
- **Decision**: Screen 2 has an always-visible "Pulled this box" panel under the opener. Each `onReveal` updates the saved run (as today) and then redraws that panel from `box.pulled` with `groupPulled` (rarest first, then name, identical grouped with a count). The list is its own element, so redrawing it never touches the pack being revealed.
- **Rationale**: `groupPulled` already sorts as the clarification asks; redrawing only the list keeps the reveal animation intact and is fast for 216 cards.
- **Alternatives**: Keeping the toggle button (rejected by the request); virtualising the list (unnecessary at this size).

## 7. Loose boosters screen
- **Decision**: Screen 3 lists `packInventory` entries with amount > 0 as booster tiles (picture, name, `×amount`) with an "Open one" button; the open loose pack (`run.extraPack`) shows the pack area, the pulled strip and the same real-time pulled list for that pack. The pack is generated before being taken from the inventory (existing rule) and is saved in the run, so it survives leaving the page.
- **Rationale**: Same data and rules as today's "Bought boosters" panel, moved and restyled with the shared tile; the empty state links to the Store (FR-014).
- **Alternatives**: Showing zero-amount tiles dimmed (rejected: the request says only owned ones).

## 8. One pack open at a time across screens
- **Decision**: Both pull screens check the saved run: `box.pack` (stage) and `extraPack` (loose) are independent in the saved run, so each screen reads and reopens its own pack; "Open one" and "Next pack" stay disabled while their own pack is open, and a loose pack is not blocked by a stage pack (as today).
- **Rationale**: Preserves current behaviour (FR-015) with no new coupling.

## 9. Testing
- **Decision**: New pure rules (`newRun` with a start set, `reachedBoosters`, `stageState` "skipped", `runSummary` totals, `remainingStages`, backwards compatibility for runs without `startSet`) and a pulled-list ordering check go into `shared/contract-tests.js`.
- **Rationale**: Same pattern as the other features; the pages are verified with `quickstart.md`.
