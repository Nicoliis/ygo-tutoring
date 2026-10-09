# Phase 0 Research: Progression Series Pack Puller

All items in the plan's Technical Context were resolvable from the existing repository
conventions, the sibling Draft Collection Manager feature, and the constitution; no items
required external research or carry a `NEEDS CLARIFICATION` marker. This document records the
decisions made and why, per the Phase 0 output contract.

## Decision: New sibling page (`tracker.html`/`.js`/`.css`) rather than a 4th column in `collection.html`

- **Decision**: Build this feature as its own page/script/stylesheet trio, separate from
  `collection.html`/`collection.js`/`collection.css`.
- **Rationale**: `collection.html`'s layout was already tuned through several rounds of explicit
  feedback ("crammed", then "still crammed") into a fixed-height 3-column grid sized exactly for
  Backlog / Engines / Decks. Appending a 4th column would either re-introduce the cramped layout
  the user already asked to fix, or force a layout redesign that wasn't requested. A new page
  avoids disturbing a UI that was deliberately iterated on, and matches Constitution Principle
  III's one-workflow-per-page precedent.
- **Alternatives considered**: A 4th grid column was rejected for the reason above. A modal/
  overlay panel within `collection.html` was considered but rejected as more complex to build
  (focus trapping, scroll-locking) for no real benefit over a plain new page, given this project
  has no SPA routing to make page navigation feel heavyweight.

## Decision: Trackers persist in the same shared `localStorage` blob as the Backlog

- **Decision**: Extend the existing `ygoCollection` JSON blob with a new `trackers` array,
  rather than introducing a second `localStorage` key.
- **Rationale**: The whole point of this feature is that pulled cards become backlog cards —
  keeping both in one blob under one key means there is exactly one place that owns "what cards
  does the user have," matching the Backlog's role as "the single source of truth" (spec.md,
  Draft Collection Manager). A second key would require explicit synchronization logic between
  two independently-read/written blobs, which is unnecessary complexity for no benefit.
- **Alternatives considered**: A separate `ygoProgressionTrackers` key was considered (cleaner
  separation of concerns) but rejected — it would need the exact same "read current cards,
  merge, write back" logic as the shared-key approach just to update the backlog, plus now two
  keys to keep consistent, for no simplification in return.

## Decision: Logging a pull reuses the Backlog's existing merge-by-name rule, duplicated locally

- **Decision**: `tracker.js` implements its own small `addOrIncrementCard`-equivalent function
  (trim, case-insensitive name match, increment-or-create), identical in behavior to
  `collection.js`'s, rather than importing or sharing code between the two pages.
- **Rationale**: This matches the explicit "share no runtime code or build tooling" structure
  decision already recorded in the Draft Collection Manager's plan.md. Introducing a shared
  script file (or a build step to bundle one) to avoid ~10 lines of duplication would cost more
  in complexity than it saves, per Constitution Principle III.
- **Alternatives considered**: A shared `shared.js` loaded by both pages was considered and
  rejected — it would be the project's first cross-page shared runtime file, a bigger structural
  change than this feature warrants, for a small amount of duplicated logic.

## Decision: Checklist completion is computed from raw pull history, not stored as a flag

- **Decision**: Whether a given checklist entry has been "collected" is computed on every render
  by scanning the tracker's full pull history for a matching card name, rather than storing a
  `collected: true/false` flag on each checklist entry that gets updated imperatively.
- **Rationale**: This is the same "derive, don't duplicate" approach `collection.js` already
  uses for backlog allocation counts (see the sibling feature's research.md). It also directly
  answers one of this spec's edge cases for free: if the user edits a tracker's checklist after
  logging pulls, completion is automatically correct on the next render — there is no stale flag
  that could fall out of sync.
- **Alternatives considered**: A stored per-entry boolean, updated at pull-logging time, was
  rejected as introducing a second source of truth that the checklist-editing edge case would
  then need explicit code to keep in sync.

## Decision: A pull is logged as a multi-line, one-card-per-line text entry

- **Decision**: The pull-logging control is a single textarea where each non-blank line is one
  physical card obtained from that pack; submitting logs one pull (one pack-opened event) and
  writes every named line into the shared backlog.
- **Rationale**: A real pack yields several cards at once; requiring the user to use the
  single-card "add to backlog" flow once per card (as `collection.js` already offers) would be
  high-friction busywork for the exact workflow this feature exists to streamline. A multi-line
  box lets the user type (or paste) everything they pulled from one pack in a single action,
  directly serving Constitution Principle I (minimize input friction) and spec.md's SC-001
  ("log a full pack's worth of pulled cards... in under 20 seconds").
- **Alternatives considered**: Repeating the existing single-card-at-a-time form was rejected as
  exactly the friction this feature is meant to remove. A fixed number of individual inputs (one
  per expected card in a pack) was rejected because Progression Series packs don't have a single
  universal card-per-pack count the app can assume.
