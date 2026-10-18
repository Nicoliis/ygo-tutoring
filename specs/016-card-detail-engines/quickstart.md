# Quickstart: Engines Panel in the Card Details Window

## Prerequisites
- Serve the folder statically (for example `python3 -m http.server`).
- A Progression Run profile with a few owned cards and two engines, a Sandbox profile, and an open pack in the Progression Run.

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
Open `shared/tests.html`: the engine rules and the early-save checks pass. (Known: the three money tests tied to the booster base price may need updating separately.)

## 2. The panel (User Story 1)
1. In the Workshop Backlog open an owned card: details on the left, the engines panel on the right with every engine and `×n`.
2. Add a copy to an engine: the count rises at once and "Added to <engine>" is announced. Remove a copy: the count falls; removing the last shows ×0.
3. Own the card twice: add until the engine holds 2, then the add button is disabled and says why.
4. Open the Synergy Builder: the engines show the same copies.

## 3. New engine (User Story 2)
1. Type a name in the new-engine field and confirm: the engine appears at the top with ×1 and exists in the Workshop.
2. Confirm an empty name: nothing is created and the field says a name is needed.
3. With a profile that has no engines: the panel says there are none and offers the field.

## 4. Every window (User Story 3)
Open details from each of: Backlog, an engine tile, a deck tile, Store sell, Completionist Binder (an owned and a missing card), the pulled strip and "See pulled" in the Progression Run, a Draft pick, and the pack tracker. The panel is present in all nine. For a card you do not own the add buttons are disabled with the note. At phone width the panel sits under the details with no horizontal scroll.

## 5. While pulling (User Story 4)
1. Open a pack, click a pulled card you do not own yet, add it to an engine: it is saved to the Backlog at once (check the Workshop in another tab after the change) and sits in the engine.
2. Finish the pack: that card's Backlog count is exactly the copies pulled (not +1).
3. Pull two identical cards, add both to engines: the Backlog ends with two copies.
4. Close the page mid-pack, reopen, finish the pack: no duplicate copy.
5. In the Booster Draft: open a card you kept and add it to an engine: saved now, not saved again at the end. A card you have not picked shows the read-only note.
6. Make storage unavailable (or full) and try an add: a clear message appears and nothing changes.

## 6. Other pages stay in sync
On Store sell: open a card, add it to an engine, then sell another card: the engine addition is still there (no stale overwrite). Same on the Tracker.
