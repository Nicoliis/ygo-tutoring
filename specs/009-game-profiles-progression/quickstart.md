# Quickstart: Validating Profiles & Progression Mode

Serve the repo root statically (e.g. open `index.html` via any static server) and use a browser console to reset state when needed (`localStorage.clear()`).

## Prerequisites
- Existing app runs. For migration scenario, first save some data in the Collection page *before* applying this feature's code (or hand-set `ygoCollection` in the console).

## Scenario 1: Legacy data survives (US5, SC-006)
1. With `ygoCollection` populated and no `ygoProfiles` key, load `index.html`.
2. Expect a "Sandbox" profile listed. Select it; Collection page shows the same cards/decks as before.

## Scenario 2: Isolation (US1, SC-003)
1. Create profiles "A" and "B" (Progression).
2. In A add a card in Collection; switch to B.
3. Expect B's backlog empty; switching back to A shows the card.

## Scenario 3: Progression cycle (US2–US4)
1. In a new Progression profile open the Progression page: backlog empty, current stage = first booster in `draft/mainline-boosters.js`.
2. Try "Complete stage" before opening: blocked with explanation.
3. Open box (confirm): 24 packs added to backlog; try opening again: blocked.
4. Build a deck in Collection from the backlog; return and complete the stage (confirm).
5. Expect next booster is current; backlog and deck unchanged; overview lists completed/current/remaining.
6. Reload: run resumes at the same stage.

## Scenario 4: Failure safety
1. Go offline, press Open box: error shown, box NOT marked opened; go online and retry succeeds.

## Scenario 5: Export/import (FR-015)
1. Run `exportAll()`; inspect JSON: contains `ygoProfiles`, per-profile collection keys and `ygoRun_<id>`.
2. Clear storage, `importAll(file)`: profiles and run states restored.

## Automated check
- `node shared/profiles.test.js` (key resolution, name validation, stage transitions) — requires Node.
