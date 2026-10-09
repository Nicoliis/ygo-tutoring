# Quickstart: Draft Collection Manager

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in a browser after implementation to confirm the feature
works end-to-end. Each scenario references the acceptance scenarios in `spec.md` and the fields
in `data-model.md`.

## Prerequisites

- The repository's static files (no build step — see `research.md`), including the new
  `collection.html`, `collection.js`, `collection.css`.
- Any static file server, or open `collection.html` directly in a browser (e.g. via
  `file://`), the same way `index.html` is used today.
- A browser with DevTools available, to inspect `localStorage` when verifying persistence.

## Scenario 1 — Backlog (spec User Story 1)

1. Open `collection.html` with an empty backlog.
2. Add a card "Pot of Greed" with quantity 3.
   - **Expect**: it appears in the backlog list showing "3 owned, 3 available."
3. Add "Pot of Greed" again with quantity 2.
   - **Expect**: the existing entry's owned quantity becomes 5 (no duplicate row) — validates
     `data-model.md` OwnedCard identity-by-name-on-add behavior and spec Acceptance Scenario
     1.3.
4. Add 10+ differently-named cards, then type a partial name into the search box.
   - **Expect**: only matching cards remain visible (spec Acceptance Scenario 1.2).
5. Reload the page.
   - **Expect**: all cards and quantities are unchanged (FR-010, `localStorage` persistence).

## Scenario 2 — Engines (spec User Story 2)

1. With at least two backlog cards available, select two of them and save as a new Engine named
   "Progression Series".
   - **Expect**: a new engine appears listing those two cards and quantities (spec Acceptance
     Scenario 2.1).
2. Attempt to save an engine with only one card selected.
   - **Expect**: rejected per `data-model.md` Engine validation (minimum 2 cards, FR-004).
3. Rename "Progression Series" and remove one card from it.
   - **Expect**: the change is reflected on the engine only; any other existing engine is
     unaffected (spec Acceptance Scenario 2.2).
4. Create a second, differently-named engine.
   - **Expect**: both engines are listed distinctly with their own contents (spec Acceptance
     Scenario 2.3).

## Scenario 3 — Decks and export (spec User Story 3)

1. Create a new deck "Draft Deck A"; add a few individual backlog cards and the "Progression
   Series" engine to it.
   - **Expect**: the deck's shown card list is the correctly totaled flattening described in
     `data-model.md`'s `resolvedCardList` (spec Acceptance Scenario 3.1).
2. Create a second deck "Draft Deck B" with different/overlapping cards; edit Draft Deck A
   (rename it or change its contents).
   - **Expect**: Draft Deck B is unaffected (FR-011, spec Acceptance Scenario 3.2).
3. Export Draft Deck A.
   - **Expect**: a complete, correctly totaled plain-text list of card names and quantities is
     produced, downloadable/copyable (FR-009, spec Acceptance Scenario 3.3, SC-005).
4. Check the backlog view for a card used in both an engine and a deck beyond its owned quantity.
   - **Expect**: that card's "available" quantity is shown as a visible warning (e.g. negative or
     highlighted), not a silent failure or a blocked action (spec Assumptions: soft warning, not
     a hard block; FR-008).
5. Delete a backlog card that is referenced by an engine and a deck.
   - **Expect**: a confirmation prompt names how many engines/decks reference it before deletion
     proceeds, then those references are cleanly removed (`data-model.md` OwnedCard deletion
     rule; Constitution Principle I).

## Sign-off

All five SC criteria in `spec.md` (`SC-001`…`SC-006`) should feel true while running through the
scenarios above: logging a card is near-instant, finding a card by search is fast, assembling an
engine or a full deck takes well under the stated time budgets, and export always produces a
complete list.
