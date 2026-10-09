# Quickstart: Progression Series Pack Puller

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in a browser after implementation to confirm the feature
works end-to-end. Each scenario references the acceptance scenarios in `spec.md` and the fields
in `data-model.md`.

## Prerequisites

- The repository's static files, including the new `tracker.html`, `tracker.js`, `tracker.css`,
  alongside the existing `collection.html`/`collection.js`/`collection.css`.
- Open `tracker.html` directly in a browser (e.g. via `file://`), the same way the other two
  pages are used today.
- Have `collection.html` open in a second tab (or reloadable) to cross-check backlog quantities,
  since both pages read/write the same `localStorage` blob.
- A browser with DevTools available, to inspect `localStorage` (`ygoCollection` key) directly if
  needed.

## Scenario 1 — Logging a pull feeds the backlog (spec User Story 1)

1. Open `tracker.html` with no trackers yet; create a tracker named "Box A".
2. Log a pull against "Box A" entering two lines: "Pot of Greed" and "Pot of Greed" (same name
   twice).
   - **Expect**: the pull is accepted; the tracker now shows "1 pack opened" (spec Acceptance
     Scenario 1.2).
3. Switch to `collection.html` (or reload it) and check the Backlog.
   - **Expect**: "Pot of Greed" appears with owned quantity 2 (spec Acceptance Scenario 1.1,
     `data-model.md` shared-merge rule — two occurrences in one pull increment by 2).
4. Back in `tracker.html`, log a second pull with one line: "Totally Not On Any Checklist".
   - **Expect**: accepted without error, backlog gains that card, and the tracker's packs-opened
     count becomes 2 (spec Acceptance Scenario 1.3 — an unlisted/bonus card is still accepted).

## Scenario 2 — Checklist completion progress (spec User Story 2)

1. On "Box A", add a checklist with three entries: "Pot of Greed", "Raigeki", "Monster Reborn".
2. View the tracker.
   - **Expect**: completion shows "1 of 3" (only "Pot of Greed" has been pulled so far), and
     "Raigeki" / "Monster Reborn" are listed as outstanding (spec Acceptance Scenarios 2.1, 2.2).
3. Log a pull containing "Raigeki".
   - **Expect**: completion updates to "2 of 3" live, "Raigeki" no longer appears in the
     outstanding list.
4. Create a second tracker "Box B" with no checklist defined, and log a pull against it.
   - **Expect**: "Box B" shows its packs-opened count normally, with no broken or misleading
     completion fraction shown (spec Acceptance Scenario 2.3).

## Scenario 3 — Multiple independent trackers (spec User Story 3)

1. With "Box A" and "Box B" both existing, rename "Box B" to "Box B - Reopened".
   - **Expect**: "Box A"'s name, checklist, and pull history are all unaffected (spec Acceptance
     Scenario 3.2).
2. Delete "Box B - Reopened" (confirm the prompt).
   - **Expect**: "Box A" is unaffected; the deletion prompt appeared before anything happened
     (Constitution Principle I).
3. Check `collection.html`'s Backlog again.
   - **Expect**: every card quantity contributed by "Box B - Reopened"'s pulls (before deletion)
     is still present unchanged — deleting a tracker does not retract backlog quantities (spec
     Acceptance Scenario 3.3, FR-009).

## Sign-off

All four SC criteria in `spec.md` (`SC-001`…`SC-004`) should feel true while running through the
scenarios above: logging a full pack takes well under the stated time budget, a tracker's
pack-count and checklist completion are visible without extra clicks, backlog totals always
exactly match what was logged, and multiple trackers never interfere with each other.
