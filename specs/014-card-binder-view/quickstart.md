# Quickstart: Card Binder View

## Prerequisites
- Serve the folder statically (for example `python3 -m http.server`) and open `workshop/backlog.html`.
- A profile with more than 40 cards in its Backlog (Sandbox profile for edit/remove checks, Progression Run profile for the read-only checks).

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
Also open `shared/tests.html` in a browser: all checks, including the binder paging ones, pass.

## 2. Backlog binder (User Story 1)
1. Open the Backlog: two pages of 3×3 pictures are visible (18 cards) with "Pages 1–2 of N".
2. Click Next until the end; Previous is disabled on the first view and Next on the last; the last view leaves empty slots.
3. Type in the search box, apply a filter, change the sort: the binder returns to the first view each time.
4. Edit a quantity or remove a card while on a later view: the binder stays on that view (or the last one if it no longer exists).
5. Search for something with no result and with an empty Backlog: the usual messages appear, no empty pages.

## 3. Card actions (User Story 2)
1. Click a card: its details open. Press Enter or Space on a focused card: same.
2. Drag a card onto an engine and onto a deck section: it is added with the same limits as before.
3. Sandbox profile: stepper and remove are present and work. Progression Run profile: quantity is read-only, no remove.
4. Block image loading (or use a card without an image): the stand-in shows the card name in the same slot.

## 4. Engines and decks (User Story 3)
1. Open `workshop/deckbuilding.html` and `workshop/synergy.html`: engine and deck cards show as pictures, one per copy, no page controls.
2. Fill a section with more than 18 cards: all are visible by scrolling the page.
3. Remove a card from an engine and a deck section, drag a deck card to another section: results match the previous behaviour.

## 5. Narrow window and performance
1. Narrow the window to phone width (under 700 px): one page (9 cards) is shown, Next/Previous move one page, the label reads "Page n of N", no horizontal scrolling.
2. Widen the window again: two pages return and you are at the same cards.
3. In the browser's network panel, turn a page: only images of the new view are requested; going back requests none.
4. Keyboard only: reach Previous/Next, open a card, use the stepper and remove.
