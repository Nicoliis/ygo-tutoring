# Quickstart: Progression Screens and Starting Set

## Prerequisites
- Serve the folder statically (`python3 dev-server.py`).
- A new Progression Run profile (no run yet), and another with a run in progress, loose boosters in the Store inventory (buy two sets) and a lost duel's packs.

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
Open `shared/tests.html`: the start-set, reached-sets, state, summary and pulled-order checks pass.

## 2. Starting set (User Story 1)
1. Open Progression Run with a new profile: the booster list appears as the chooser, nothing started.
2. Pick the fifth set and confirm: the run starts there ("Stage 1/N", N = list length − 4); sets before it show as skipped.
3. Cancel at the confirmation: nothing is saved; choose again.
4. Open the Store: the skipped sets' boosters are buyable. Reload the run page: the chooser is not offered again.
5. An older profile (run saved earlier): opens as before, no chooser, stage numbering unchanged.

## 3. Screen 1 (User Story 2)
Summary, stage panel with Start box / Complete stage / Build decks, booster list with states, completed stages; no pack anywhere. Start box (confirm) lands on Current Stage Pull. Complete stage asks win/lose and applies the rewards.

## 4. Screen 2 (User Story 3)
1. Pull cards one by one: each appears at once in the "Pulled this box" list below, rarest first, identical cards grouped with a count; the reveal animation is not disturbed.
2. Click a card in either list: its details open (with the engines panel).
3. Reload, or go to another screen and come back: pack and lists are as left.
4. Before starting the box, and after pulling all 24 packs, the screen explains the state with a link to screen 1.

## 5. Screen 3 (User Story 4)
1. With 5 packs of one set and 2 of another: exactly those two tiles appear with ×5 and ×2 (picture and name); no tile for sets with none.
2. Open one: the pack shows, cards come one at a time, the pulled list fills in real time, ×5 becomes ×4; finish it and the cards are in the Backlog.
3. Open the last pack of a set and finish it: its tile disappears. With nothing left: the screen says so and links to the Store.
4. Leave with a pack open and return: the same pack waits; "Open one" is disabled until it is finished.

## 6. Navigation and layouts (User Story 5)
Sidebar shows the three pages in order with the current one marked; a Sandbox profile sees "No run rules" on each. At phone width, no sideways scrolling; keyboard only: choose a set, open a pack, reach every control.
