# Quickstart: Card Tag Interactions

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in a browser, **with network access** for the search/add
scenarios. Each scenario references the acceptance scenarios in `spec.md` and the fields in
`data-model.md`.

## Prerequisites

- `collection.html` (modified) and `tracker.html` (modified) open in a browser with network
  access to `db.ygoprodeck.com`.
- Browser DevTools available, both to simulate an offline/failed API (Scenario 4) and to confirm
  only one new network call shape is used (Scenario 1, step 2).

## Scenario 1 — Add a real card via search, see it as a tag (spec US1, FR-009)

1. In the Backlog panel, use the new search control to look up a known real card name (3+
   characters) and select a result.
   - **Expect**: the card appears in the backlog as a fixed-size tag showing its name — spec
     Acceptance Scenario US1/AC5.
2. With DevTools' Network tab open, hover the tag, click it once, then click it again.
   - **Expect**: hovering shows the full name + key details with no new network request; the
     first click expands to the card's real image (also no new request — it was captured at
     add-time per data-model.md); the second click opens the full-detail modal with every known
     field and the full image (spec Acceptance Scenarios US1/AC2-4).
3. Add the *same* card again via search.
   - **Expect**: its owned quantity increases rather than creating a second tag (existing
     Backlog merge rule, unchanged).

## Scenario 2 — Drag a card onto an engine and a deck (spec US2)

1. With at least one existing engine and one existing deck, drag a backlog card tag onto the
   engine.
   - **Expect**: the card is added to that engine (or its quantity increases), exactly as the
     existing "Edit engine" form-based path would do it — spec Acceptance Scenario US2/AC1.
2. Drag a backlog card tag onto the deck.
   - **Expect**: same result, added to the deck's contents — spec Acceptance Scenario US2/AC2.
3. Drag a card tag and drop it somewhere that isn't an engine or a deck (e.g. the page
   background).
   - **Expect**: nothing changes — spec Acceptance Scenario US2/AC3.
4. Confirm the existing form-based "add to engine" / "add to deck" controls are still present and
   still work, unchanged (FR-005/FR-006 — drag supplements, does not replace).

## Scenario 3 — Removal modals, including newly-confirmed ones (spec US3)

1. Remove a backlog card, delete a whole engine, delete a whole deck, and delete a tracker (in
   `tracker.html`).
   - **Expect**: each now shows a custom in-app modal naming the specific item, not a browser
     popup — spec Acceptance Scenarios US3/AC1-3.
2. Remove a single card from inside an existing engine's contents (not the whole engine), remove
   a single item from inside a deck's contents, and remove a single checklist entry in
   `tracker.html`.
   - **Expect**: each of these — which had **no** confirmation at all before this feature — now
     also shows the same modal pattern before removing anything (FR-007, Clarifications Q2).
3. For any one of the above, cancel instead of confirming.
   - **Expect**: nothing is removed and the modal closes (spec Acceptance Scenario US3/AC2).

## Scenario 4 — Fail safely when the card database is unreachable (FR-010)

1. Block or simulate an offline state for `db.ygoprodeck.com`.
2. Attempt to search for and add a new card.
   - **Expect**: a clear error message appears; the backlog is unchanged (spec Clarifications,
     FR-010, SC-006).
3. Restore network access and confirm the same search now succeeds normally.
4. Independently of the above, confirm removing cards, dragging existing cards onto
   engines/decks, and viewing tags (hover/expand/modal) for already-added cards all continue to
   work with the network blocked — only *adding a new* card depends on connectivity.

## Scenario 5 — Keyboard/touch-only use (FR-006, SC-005)

1. Using only the keyboard (Tab/Enter/Space, no mouse), confirm a card can still be added to an
   engine and a deck via the existing form-based controls, and a removal modal can be opened,
   navigated, and confirmed or cancelled, entirely via keyboard.
2. On a touch device (or a touch-emulated viewport), confirm a single tap on a card tag reaches
   the image-expanded state (showing key details inline, no hover step), and a second tap opens
   the modal — per the spec's touch-device Assumption.

## Sign-off

All six SC criteria in `spec.md` should hold after the scenarios above: tags never resize/shift
(SC-001); image + key details are visible without navigating away (SC-002); a drag adds a card
with no typing (SC-003); 100% of removals — old and newly-confirmed alike — show the modal
(SC-004); every action remains reachable without drag/hover (SC-005); and an unreachable database
fails every add attempt safely with no partial result (SC-006).
