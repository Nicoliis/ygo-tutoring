# Feature Specification: Progression Series Pack Puller

**Feature Branch**: `002-progression-pack-tracker`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "I would like to add a \"progression series pack puller\" and keep
track of the progress in the backlog"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a pack pull straight into the backlog (Priority: P1)

A player owns a Progression Series box (a product sold as a fixed set of packs building toward
a known card pool) and opens it incrementally, one pack at a time. After opening a pack, they
want to log the cards they just pulled in one go, and have those cards immediately become part
of their owned backlog — without re-entering each card into the backlog separately.

**Why this priority**: This is the core value of a "pack puller": turning the physical act of
opening a pack into an update to the single backlog the rest of the app already relies on.
Without this, the feature is just a disconnected checklist.

**Independent Test**: Can be fully tested by creating a tracker for a box, logging one pack's
worth of card names against it, and confirming those same cards now appear with increased owned
quantity in the existing Backlog.

**Acceptance Scenarios**:

1. **Given** a newly created tracker, **When** the user logs a pack pull by entering the card
   name(s) they received, **Then** each named card's owned quantity in the backlog increases
   (or the card is added if new), exactly as if it had been added directly to the backlog.
2. **Given** a tracker that has had pulls logged, **When** the user views the tracker, **Then**
   the number of packs logged as opened so far is shown.
3. **Given** a card pulled that isn't part of the tracker's known checklist (an unexpected or
   "bonus" card), **When** the pull is logged, **Then** the card is still added to the backlog
   and the pull is still counted, without being required to match a checklist entry.

---

### User Story 2 - Track completion progress against the box's checklist (Priority: P2)

Progression Series boxes are built around a known, fixed pool of unique cards. The user wants to
see, at a glance, how much of that pool they've already pulled at least one copy of, and which
cards are still outstanding, so they know how close they are to completing the set.

**Why this priority**: This is the "keep track of the progress" half of the request. It builds
directly on the pull-logging from Story 1 — there's nothing to show progress on until pulls
exist — so it's second in priority.

**Independent Test**: Can be fully tested by defining a tracker's checklist (the box's expected
unique cards), logging pulls that match some of them, and confirming the displayed progress
(e.g. "6 of 20 collected") and the list of still-outstanding cards are both correct.

**Acceptance Scenarios**:

1. **Given** a tracker with a defined checklist, **When** the user views it, **Then** the
   fraction of the checklist's unique cards pulled at least once so far is shown.
2. **Given** a tracker with a defined checklist, **When** the user views it, **Then** the cards
   from the checklist not yet pulled are listed distinctly from the ones already obtained.
3. **Given** a tracker with no checklist defined, **When** the user views it, **Then** pack
   progress still shows normally and no broken or misleading completion fraction is displayed.

---

### User Story 3 - Manage multiple independent trackers (Priority: P3)

A user may own more than one Progression Series box at a time (the current one and others from
past or future purchases). They want to create, rename, and delete trackers independently,
exactly as they already can with engines and decks elsewhere in the app.

**Why this priority**: Multi-tracker support is a natural extension once a single tracker works
end-to-end (Stories 1-2), matching the multi-instance pattern already established for engines
and decks — useful, but not blocking for a first working version.

**Independent Test**: Can be fully tested by creating two trackers, logging different pulls
against each, and confirming that renaming or deleting one tracker has no effect on the other's
logged progress or on the backlog quantities contributed by either.

**Acceptance Scenarios**:

1. **Given** no trackers exist, **When** the user creates a new tracker with a name, **Then** a
   new, independent tracker appears ready to accept pulls.
2. **Given** multiple trackers exist, **When** the user renames or deletes one, **Then** the
   other trackers' names, checklists, and logged progress are unaffected.
3. **Given** a tracker is deleted, **When** the user checks the backlog, **Then** the owned
   quantities already contributed by that tracker's past pulls remain unchanged (deleting a
   tracker stops its tracking, it does not retroactively remove cards from the backlog).

---

### Edge Cases

- What happens when the user pulls more total copies of a checklist card than the box is stated
  to contain? (e.g. the checklist says 2 copies exist in the box, but 3 have been logged)
- How is a pulled card that doesn't match any checklist entry displayed in the progress view —
  does it count toward "packs opened" even though it doesn't count toward checklist completion?
- What happens when the user logs a pull with an empty or whitespace-only card name?
- What happens when a tracker's checklist is edited (cards added or removed) after pulls have
  already been logged against it — do already-logged pulls get re-evaluated against the new
  checklist?
- What happens when the user deletes a backlog card entirely (from the Backlog panel) that was
  originally contributed by a tracker's pull — does the tracker's history reflect that it's gone?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a named tracker representing one Progression Series
  box they are opening.
- **FR-002**: Users MUST be able to define a tracker's checklist — the set of unique card names
  expected in that box — at creation time or later; the checklist MUST be optional (a tracker
  can log pulls with no checklist defined at all).
- **FR-003**: Users MUST be able to log a pack pull against a tracker by entering the name(s) of
  the card(s) obtained from opening one pack.
- **FR-004**: System MUST reflect every card logged via a pack pull in the shared Backlog,
  increasing that card's owned quantity (or creating it if not already present) exactly as a
  direct backlog addition would.
- **FR-005**: System MUST track and display, for each tracker, how many packs have been logged
  as opened.
- **FR-006**: System MUST track and display, for each tracker with a defined checklist, how many
  of the checklist's unique cards have been pulled at least once, and MUST list which checklist
  cards are still outstanding.
- **FR-007**: A pulled card that does not match any checklist entry MUST still be accepted,
  still contribute to the backlog, and still count toward packs opened, without blocking the
  pull or requiring the checklist to be amended first.
- **FR-008**: Users MUST be able to create, rename, and delete multiple independent trackers;
  changes to one tracker MUST NOT alter any other tracker.
- **FR-009**: Deleting a tracker MUST NOT remove or reduce any backlog quantity previously
  contributed by that tracker's logged pulls.
- **FR-010**: System MUST persist all trackers, their checklists, and their logged-pull history
  across browser sessions without requiring an account or login.

### Key Entities

- **Progression Tracker**: Represents one Progression Series box a user is opening; has a name,
  an optional checklist, a count of packs logged as opened, and a history of logged pulls.
- **Checklist Entry**: One unique card name expected in a tracker's box, used only to compute
  completion progress — not a requirement for logging a pull.
- **Pull**: One logged pack-opening event against a tracker, recording the card name(s) obtained;
  each named card also exists as (or updates) an Owned Card in the shared Backlog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a full pack's worth of pulled cards (and see them reflected in the
  backlog) in under 20 seconds.
- **SC-002**: A user can see a tracker's pack-opened count and checklist completion fraction
  (when a checklist exists) at a glance, with no additional action needed.
- **SC-003**: 100% of cards logged through a pack pull are reflected with the correct increased
  quantity in the backlog, with no discrepancy between the tracker's log and backlog totals.
- **SC-004**: A user can maintain 3 or more concurrently active trackers without one tracker's
  edits or deletion affecting another's recorded progress.

## Assumptions

- This feature extends the existing Draft Collection Manager and its single shared Backlog
  (from the "Draft Collection Manager" feature); it is not a standalone card database or a
  randomized pack-opening simulator.
- "Pulling a pack" is a manual logging action: the user has physically opened a real pack and
  types in the card name(s) they actually received. The system does not simulate or randomly
  generate pack contents — this keeps the feature a tracking companion for a real box, matching
  the rest of the app's "track what you actually own" premise, rather than introducing random
  number generation, rarity slots, or pack-structure modeling.
- There is no built-in database of official Progression Series box checklists; if a user wants
  completion tracking, they enter that box's known checklist themselves as free text, the same
  way backlog card names are free text elsewhere in the app.
- A tracker's checklist does not need to specify exact per-card print counts to be useful;
  completion progress is tracked as "pulled at least once" versus the full unique checklist
  list. A per-card expected-count field may be added later if needed but is not required for
  this feature to deliver value.
- Multiple trackers are fully independent of one another and of the backlog's other sources
  (manually added cards, cards added via engines/decks have no bearing here) — a tracker is
  purely an additional, optional way of feeding the one shared backlog and watching progress
  toward one box's checklist.
