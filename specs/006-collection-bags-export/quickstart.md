# Quickstart: Collection Bags & Deck Export

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in `collection.html`, with network access (needed for the
backfill lookup and for adding new cards).

## Prerequisites

- `collection.html` (modified) open in a browser with network access to `db.ygoprodeck.com`.
- At least one backlog card added **before** this feature existed (plain name, no stored image) —
  if none exists, add one directly to `localStorage`'s `ygoCollection.cards` with just `{id, name,
  quantityOwned}` to simulate one, or use a card added before Card Tag Interactions shipped.

## Scenario 1 — Old backlog cards get real details on first view (spec US1, FR-001-FR-004)

1. Find (or create) a backlog card with no stored image, and open DevTools' Network tab.
2. Hover its tag.
   - **Expect**: exactly one new network request fires (an exact-name lookup); shortly after, the
     tag's hover overlay and image-expanded view show real data, same as an already-enriched card.
3. Hover or click that same card again.
   - **Expect**: no new network request — the data is already stored (SC-001).
4. Click it a second time to open its full detail view.
   - **Expect**: the view now also shows the card's effect/description text (FR-004), not shown
     anywhere before this feature.
5. Find a backlog card whose name doesn't match any real card (or simulate one), hover it.
   - **Expect**: the existing "no image available" fallback is shown, and hovering it again does
     **not** fire a second network request (FR-003).

## Scenario 2 — Engines as simple, clickable bags (spec US2, FR-005-FR-007, FR-011-FR-012, FR-018)

1. Create a new engine.
   - **Expect**: only a name is required — no card selection step — and it's created immediately,
     empty (FR-018).
2. With the new engine collapsed, confirm it shows only its name (plus Delete and a rename
   control) — no card list, no count badge.
3. Click anywhere on the collapsed engine.
   - **Expect**: it expands to show every card inside it (none yet), rendered the same way as
     backlog cards.
4. Drag a backlog card onto the expanded engine.
   - **Expect**: the card is added and appears in the engine's card list immediately.
5. Click anywhere on the expanded engine's header/body area (not on the card itself).
   - **Expect**: it collapses back to showing just its name.
6. Expand it again, then drag one of its cards onto the visible bin.
   - **Expect**: the card is removed from the engine with no confirmation prompt. Repeat using the
     non-drag "✕" control instead of dragging — same result.
7. Try renaming the engine.
   - **Expect**: a rename control works; there is no bulk, checkbox-based way to replace its whole
     card list anymore.

## Scenario 3 — Decks as Main/Extra bags with engine-drop resolution (spec US3, FR-008-FR-010, FR-013)

1. Create a deck, expand it, and confirm it shows two sections: Main Deck and Extra Deck.
2. Drag a backlog card onto the Main Deck section, then another onto the Extra Deck section.
   - **Expect**: each card appears only in the section it was dropped on.
3. Drag an engine (with 2+ cards in it) onto the Main Deck section.
   - **Expect**: every card from that engine appears in Main Deck as individual card entries — the
     deck does not show "this engine" as a single item anywhere.
4. Afterward, add another card to that same engine, then look at the deck again.
   - **Expect**: the deck's Main Deck contents are unchanged — editing the engine after the drop
     has no retroactive effect (FR-010).
5. Drag a card out of a deck section onto the visible bin (and separately, via the non-drag "✕").
   - **Expect**: it's removed from that section immediately, no confirmation.

## Scenario 4 — YDK Export and Import (spec US3, FR-014-FR-017)

1. With a deck containing cards in both Main and Extra (all added via search, so they carry a real
   `apiId`), click Export.
   - **Expect**: valid YDK-format text (`#main`, `#extra`, `!side` sections of numeric passcodes)
     is copied to the clipboard, and a `.ydk` file download is offered.
2. Create a second, empty deck and click its Import, pasting (or uploading) the text from step 1.
   - **Expect**: the new deck's Main and Extra contents match the exported deck's, card for card
     (SC-004).
3. Edit the exported YDK text to include one extra, made-up passcode not in your backlog, then
   import it into a fresh deck.
   - **Expect**: every real card still imports correctly; the fake passcode is skipped and listed
     in a clear message (FR-017) — nothing else is affected.
4. Import malformed or empty text.
   - **Expect**: a clear message is shown and no deck is created or changed.

## Scenario 5 — Keyboard-only use (Constitution Principle I)

1. Using only the keyboard (Tab/Enter/Space), expand an engine, add a card via its non-drag
   control, remove a card via its "✕" button, and collapse it again.
2. Do the same for a deck's Main and Extra sections, plus Export and Import.
   - **Expect**: every action in Scenarios 2-4 remains fully reachable and operable without a
     mouse.

## Sign-off

All five SC criteria in `spec.md` should hold after the scenarios above: every backlog card shows
real detail after one lookup with zero duplicates (SC-001); collapse/expand works with a single
click anywhere on a bag (SC-002); Export produces a valid, clipboard-copied YDK file (SC-003);
Import reconstructs a matching deck for every backlog-known card (SC-004); and existing decks and
engines keep working with no data loss after the migration (SC-005).
