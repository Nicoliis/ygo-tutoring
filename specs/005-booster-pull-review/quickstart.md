# Quickstart: Booster Pull Review

Manual validation guide (the project has no automated test suite — see `plan.md` Technical
Context). Run through these scenarios in `tracker.html`, with network access (needed once per set,
to build its card pool).

## Prerequisites

- `tracker.html` (modified) open in a browser with network access to `db.ygoprodeck.com`.
- At least one tracker created, and a set selected via the Set Picker.

## Scenario 1 — Review before committing (spec US1, FR-001-FR-005)

1. With a set selected, enter a pack count and click "Simulate pull".
   - **Expect**: the drawn cards appear as minicards in a pending-review area; the tracker's
     "pack(s) opened" badge does **not** yet increase, and the backlog gains no new cards — spec
     Acceptance Scenario US1/AC1.
2. Click **Save**.
   - **Expect**: the backlog gains the pulled cards (existing merge-by-name rule), the "pack(s)
     opened" badge increases by exactly the pack count simulated, and the pending review clears —
     spec Acceptance Scenario US1/AC2.
3. Simulate another pull, then click **Discard**.
   - **Expect**: nothing is added to the backlog, the "pack(s) opened" badge is unchanged, and the
     pending review clears — spec Acceptance Scenario US1/AC3.
4. Simulate another pull, note the drawn cards, then click **Reattempt**.
   - **Expect**: a brand-new set of minicards replaces the old ones (no network delay — the set's
     pool is already cached), nothing was added to the backlog for the discarded draw, and the
     same set/pack count is reused without re-selecting anything — spec Acceptance Scenario
     US1/AC4, SC-003.
5. While a pull is pending review, try to click "Simulate pull" again for the same tracker.
   - **Expect**: it's disabled/unavailable until the pending pull is saved, reattempted, or
     discarded — spec Acceptance Scenario US1/AC5.

## Scenario 2 — Minicard detail (spec US2, FR-008-FR-009)

1. With a pull pending review, click one of its minicards.
   - **Expect**: a modal opens showing that card's image and (for a Monster) level/ATK/DEF — spec
     Acceptance Scenario US2/AC1. Confirm no new network request fires (DevTools Network tab) —
     the detail came from the same lookup that built the draw pool.
2. Close the modal and confirm the pending review (minicards, Save/Reattempt/Discard) is still
   exactly as it was — clicking a minicard must not itself commit, discard, or reattempt anything.

## Scenario 3 — Independence from the global set selector (Edge Case)

1. Simulate a pull for Tracker A using Set X, leaving it pending (don't resolve it yet).
2. Change the page's selected set to Set Y.
3. Click **Reattempt** on Tracker A's still-pending pull.
   - **Expect**: the new draw still comes from Set X (the pending pull's own snapshot), not Set Y.

## Scenario 4 — Keyboard-only use (Constitution Principle I)

1. Using only the keyboard (Tab/Enter/Space), simulate a pull, Tab to a minicard and open its
   detail modal, close it, then Tab to and activate Save (or Reattempt, or Discard).
   - **Expect**: every control in this flow is reachable and operable without a mouse.

## Sign-off

All five SC criteria in `spec.md` should hold after the scenarios above: a discarded pull adds
zero cards (SC-001); a minicard's image/details are visible with a single click (SC-002);
Reattempt is immediate with no re-selection needed (SC-003); Save has exactly the pre-existing
backlog/progress effect (SC-004); and no simulated pull is ever auto-committed without an explicit
Save (SC-005).
