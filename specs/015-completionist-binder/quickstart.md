# Quickstart: Completionist Binder

## Prerequisites
- Serve the folder statically (for example `python3 -m http.server`) and open `workshop/completionist.html`.
- A Progression Run profile that has reached at least two boosters and owns cards from one of them, and a Sandbox profile.

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
Open `shared/tests.html`: all checks, including the set-slot rules, pass. (The money tests tied to the booster base price may need updating separately.)

## 2. Choose a set (User Story 1)
1. Open the Completionist Binder: the chooser lists the reached sets, most recent first (Progression Run) or every mainline set (Sandbox).
2. Choose a set you own cards from: every card of the set appears as a slot in set-number order, in two 3×3 pages (one page on a narrow window), with page turning.
3. Owned slots are in colour; the rest are grey. The progress line counts coloured slots of the total and shows the percentage.
4. Choose a set you own nothing from: everything grey, progress 0. A fully owned set (use a test profile) says it is complete.

## 3. Rarities (User Story 2)
1. Pick a set with a card in several rarities (for example Legend of Blue Eyes White Dragon): the card has one slot per rarity, side by side.
2. Own only one rarity: only that slot is coloured, with its glow; the others stay grey.
3. Every slot shows its rarity tag; grey slots show the tag and "Missing" but no glow; owned slots with more than one copy show ×N.

## 4. Details and read-only (User Story 3)
1. Click an owned slot and a grey slot: the details open for both.
2. There is no drag, quantity or remove control, and the collection is unchanged.
3. Open a pack in the Progression Run, go back to the binder (also with the browser back button): the new cards are coloured and the progress is higher.

## 5. Data and errors
1. Open the browser network panel: choosing a set makes one request; choosing it again, or opening the pack for the same set earlier in the session, makes none; turning pages requests only the new pictures.
2. Go offline and choose a new set: a message and a Retry button appear and no partial binder; go online and press Retry: the binder appears.
3. With old cards that have no recorded set or rarity (or cards added by hand in Sandbox): the note shows how many copies could not be matched.
4. A new Progression Run profile with no boosters reached: the screen explains that no sets are available yet.
5. Keyboard only: reach the chooser, page buttons and every slot; screen text for a slot says name, rarity and owned or missing.
