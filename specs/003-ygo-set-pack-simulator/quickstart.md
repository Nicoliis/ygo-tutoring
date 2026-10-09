# Quickstart: YGO Set Pack Simulator

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in a browser, **with network access**, after
implementation. Each scenario references the acceptance scenarios in `spec.md` and the fields in
`data-model.md`.

## Prerequisites

- `tracker.html` (modified) open in a browser with network access to `db.ygoprodeck.com`.
- At least one tracker already created (see the Progression Series Pack Puller's own
  quickstart.md for basic tracker creation, unaffected by this feature).
- Browser DevTools available, both to inspect network requests (confirming caching — Scenario 2)
  and to simulate an offline/failed API (Scenario 3, e.g. DevTools' network throttling "Offline"
  preset, or blocking the `db.ygoprodeck.com` domain).

## Scenario 1 — Simulate a pull from a real set (spec User Story 1)

1. Open the set picker (page-level, collapsed by default) and search for a known real set name.
2. Select it. Confirm a "selected set" badge appears showing that set's name.
3. On an existing tracker, enter a pack count (e.g. 2) in the new "Simulate pull" control and run
   it.
   - **Expect**: the draw completes, and the resulting cards come only from that set (spot-check
     a few names against the set's known card list) — spec Acceptance Scenario 1.1.
4. Check the Backlog (`collection.html`).
   - **Expect**: every drawn card's owned quantity increased by exactly how many times it was
     drawn in this pull — spec Acceptance Scenario 1.2.
5. Re-check the tracker used in step 3.
   - **Expect**: its packs-opened count increased by 1 (and checklist completion, if it has a
     checklist, reflects any checklist cards that were drawn) — spec Acceptance Scenario 1.3.

## Scenario 2 — Chronological picker and caching (spec User Story 2, FR-007)

1. Open the set picker again.
   - **Expect**: sets are ordered oldest release date first; search narrows the list while
     preserving that order (spec Acceptance Scenarios 2.1, 2.2).
2. With DevTools' Network tab open, select the same set used in Scenario 1 and run a second
   simulated pull from it.
   - **Expect**: no new network request is made for that set's card data — it's reused from
     cache (FR-007, research.md caching decision).
3. Select a different set and run a pull from it.
   - **Expect**: exactly one new request for that set's card data, cached for any further pulls
     from it in this session.

## Scenario 3 — Fail safely when the API is unreachable (spec User Story 3)

1. Block or simulate an offline state for `db.ygoprodeck.com`.
2. Attempt to open the set picker (if the set list isn't already cached) or run a simulated pull
   against a set not yet cached.
   - **Expect**: a clear, actionable error message appears; nothing in the Backlog or any tracker
     changes (spec Acceptance Scenario 3.1).
3. Restore network access and retry.
   - **Expect**: the action now succeeds normally, confirming the earlier failure left no partial
     or corrupted state behind (spec Acceptance Scenario 3.2).
4. Independently of all of the above, confirm manual pull logging, tracker rename/delete, and
   checklist management on `tracker.html` still work with the network blocked — this feature's
   failure must not affect any of the app's existing offline-capable functionality.

## Sign-off

All four SC criteria in `spec.md` should hold after the scenarios above: every simulated pull's
card count matches the requested packs (SC-001) and draws only from the selected set (SC-002); a
specific set can be found in the picker quickly (SC-003); and an unreachable API fails safely
with no partial writes (SC-004).
