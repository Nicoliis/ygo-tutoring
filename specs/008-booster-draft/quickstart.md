# Quickstart: Validate Booster Draft

## Prerequisites

- No build step or server required — static site. Serve the repo root, e.g.:

  ```bash
  python3 -m http.server 8000
  ```

  then open `http://localhost:8000/draft.html` (or reach it via the sidebar from any other page).
- Requires network access to `db.ygoprodeck.com` (same as the existing Progression Series Pack
  Puller's set pack simulator).

## Scenario 1 — Configure a draft and see the live kept/total preview (User Story 1, SC-001, SC-002)

1. Open `draft.html`. Select a real set via the booster autocomplete field.
2. Enter amount `12` and cardpool `3`.
3. Confirm the page shows a live "36/108" kept/total calculation (assuming that set's booster size
   is 9 — the calculation should read `amount × (boosterSize ÷ cardpool)` kept out of
   `amount × boosterSize` total, using that specific set's resolved booster size).
4. Set amount to `0` (or clear it) and confirm "Start Draft" is prevented with a clear message.
5. Set cardpool higher than the resolved booster size and confirm "Start Draft" is prevented with a
   clear message.
6. Restore valid values, choose a grouping criterion (Rarity or Price), click "Start Draft," and
   confirm the first pick group appears as the main focus of the page (data-model.md "Booster Draft
   Session" transitions `configuring → in-progress`).

## Scenario 2 — Pick through an entire draft (User Story 2, SC-003, SC-005)

1. With a draft in progress, confirm the current pick group is the visual focus of the page and the
   (initially empty) chosen-cards strip is shown above it.
2. Click one card in the group; confirm it appears in the chosen-cards strip and the next pick group
   appears automatically (FR-013).
3. Repeat until multiple picks have been made; confirm the chosen-cards strip stays sorted
   alphabetically by name after every pick, regardless of pick order (FR-012).
4. Inspect a few pick groups across the draft and confirm no group contains two cards with the same
   name (FR-009) — note any exception only occurs when that booster's own cards leave no distinct
   alternative (edge case).
5. Confirm pick groups never mix cards from two different "boosters" — e.g., for cardpool 3 and
   booster size 9, every third pick group boundary aligns with a new booster's cards (data-model.md
   Pick Group `boosterIndex`, not shown in UI but inferable from group contents being internally
   consistent with the sort/grouping criterion per booster).

## Scenario 3 — Finish the draft and add results to the backlog (User Story 3, SC-004)

1. Before clicking "Start Draft," note the kept/total preview value (e.g., "36/108" from
   Scenario 1).
2. Resolve the final pick group of the draft.
3. Confirm the session reaches a "finished" state with an explicit "Add to Backlog" action
   presented (FR-014).
4. Count the cards in the chosen-cards strip and confirm this count exactly equals the "kept"
   number noted in step 1 — the preview must match the actual outcome 100% of the time (SC-002).
5. Click "Add to Backlog." Open `collection.html` (via the sidebar) and confirm:
   - Each kept card appears in the backlog.
   - A kept card the user already owned shows an owned quantity increased by exactly the number of
     times it was kept in this draft.
   - A kept card not previously owned appears as a new backlog entry with the correct owned
     quantity.
6. Return to `draft.html` (via the sidebar) and confirm the page has returned to its initial,
   empty configuration state, ready to start a new draft (FR-018).

## Scenario 4 — Missing price data and grouping edge cases (Edge Cases)

1. Start a draft with grouping set to "Price" against a set likely to include cards with no
   recorded `tcgplayer_price` (many older/niche cards qualify).
2. Confirm the draft completes normally with no errors, and that cards lacking price data are not
   excluded from any pick group (research.md Decision 3 — treated as lowest price).

## Scenario 5 — Abandon an in-progress draft (Edge Case / FR-017)

1. Start a draft and make at least one pick.
2. Attempt to change the booster, amount, cardpool, or grouping fields; confirm the system prevents
   this while the draft is in progress.
3. Trigger the cancel/abandon action; confirm a confirmation prompt appears (since it discards
   picks already made) and, upon confirming, the draft resets to a fresh configuration state with
   no partial cards added to the backlog.

## Expected outcome

All five scenarios pass with no console errors, exactly the two documented YGOPRODeck endpoints
called (no more than once per distinct set per session), and no regressions to the other three
pages' existing functionality (search/deck building, backlog/engine management, and the existing
Progression Series Pack Puller tracking flow).
