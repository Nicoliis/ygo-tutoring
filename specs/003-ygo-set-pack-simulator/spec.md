# Feature Specification: YGO Set Pack Simulator

**Feature Branch**: `003-ygo-set-pack-simulator`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "I would like to use the interface for packs distribution in the
YGO api and Order packs in cronological order pulling an X ammount of packs that are then added
to the backlog."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simulate opening packs from a real card set (Priority: P1)

Instead of (or alongside) manually typing in cards they physically pulled, a user wants to pick
a real Yu-Gi-Oh card set, say how many packs they're opening, and have the app randomly generate
a realistic set of pulled cards — drawn from that set's actual card pool — which are then added
to their backlog, exactly as a manual pull would be.

**Why this priority**: This is the core value being requested: turning "I opened packs from set
X" into a realistic, backlog-ready result without the user needing to own a real checklist or
type every card by hand.

**Independent Test**: Can be fully tested by picking one real card set, entering a pack count,
running the simulated pull, and confirming the resulting cards (a) come only from that set's
real card pool and (b) are reflected in the backlog with correctly increased quantities.

**Acceptance Scenarios**:

1. **Given** a real card set is selected and a pack count is entered, **When** the user runs the
   simulated pull, **Then** the system returns a set of cards drawn only from that set's real
   card pool, in a quantity consistent with the requested number of packs.
2. **Given** a completed simulated pull, **When** the user checks the backlog, **Then** every
   drawn card's owned quantity has increased by exactly how many copies of it were drawn.
3. **Given** a simulated pull is run against a Progression Tracker, **When** the user views that
   tracker afterward, **Then** its packs-opened count and (if it has a checklist) completion
   progress include the simulated pull exactly as they would a manually logged one.

---

### User Story 2 - Choose sets in chronological order (Priority: P2)

A user wants to work through Yu-Gi-Oh's real print history in order — starting from the
earliest sets and moving forward — rather than hunting for set names out of context. They want
the set picker itself to present sets ordered by original release date.

**Why this priority**: This is the "progression" framing the request explicitly asked for
(packs "in chronological order"). It's a refinement of how a set is chosen in Story 1, so it
depends on that story existing first.

**Independent Test**: Can be fully tested by opening the set picker and confirming sets appear
ordered from oldest release date to newest, and that a specific known-early set can be found and
selected.

**Acceptance Scenarios**:

1. **Given** the set picker is opened, **When** the user views the list, **Then** sets are
   ordered by original release date, oldest first.
2. **Given** the chronologically ordered list, **When** the user searches or filters by name,
   **Then** matching sets are shown while preserving chronological order among the matches.

---

### User Story 3 - Fail safely when the card database is unreachable (Priority: P3)

The rest of this app works fully offline. Adding a real-time card-data dependency for this one
feature means a user with no connection (or a temporary API outage) needs to be told clearly
what happened, without corrupting their backlog or a tracker's history.

**Why this priority**: Necessary for the feature to be trustworthy, but it's a safeguard around
Stories 1-2 rather than new standalone value, so it's lowest priority.

**Independent Test**: Can be fully tested by simulating an unreachable card database (e.g. via
dev tools network blocking) and confirming a clear, actionable message appears and nothing is
written to the backlog or any tracker.

**Acceptance Scenarios**:

1. **Given** the card database cannot be reached, **When** the user attempts a simulated pull,
   **Then** a clear error message is shown and no cards are added to the backlog or any tracker.
2. **Given** a simulated pull partially fails partway through, **When** the user checks the
   backlog and tracker, **Then** neither reflects a partial/incomplete result — the pull either
   fully succeeds or leaves no trace.

---

### Edge Cases

- What happens when the user enters a pack count of zero, a negative number, or a non-numeric
  value?
- What happens when the selected set's real card pool is smaller than what a realistic pack
  structure would need (a very small or unusual set)?
- What happens when a card in the set's data is missing rarity information needed for weighting?
- What happens when the user opens many packs from the same set back-to-back — is the set's
  card/rarity data re-fetched every time, or reused?
- What happens when the same simulated pull draws multiple copies of the same card (a common
  being pulled twice in one batch of packs)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to select a real Yu-Gi-Oh card set — from the same card
  database this app already uses elsewhere — to simulate opening packs from.
- **FR-002**: The set picker MUST present sets ordered by their original release date, oldest
  first.
- **FR-003**: Users MUST be able to specify how many packs to simulate opening from the selected
  set in one action.
- **FR-004**: System MUST randomly generate the cards produced by a simulated pull from the
  selected set's real card pool, approximating real rarity distribution (commons substantially
  more likely to be drawn than rare-tier cards) rather than drawing every card with equal odds.
- **FR-005**: Every card produced by a simulated pull MUST increase that card's owned quantity in
  the shared Backlog, exactly as a manually logged pull would (new cards are added, existing
  cards' quantities increase).
- **FR-006**: A simulated pull MUST be logged against a Progression Tracker's pull history
  exactly like a manually logged pull, so packs-opened and checklist-completion progress include
  it.
- **FR-007**: System MUST reuse a selected set's already-fetched card/rarity data for further
  simulated pulls in the same session rather than re-fetching it every time.
- **FR-008**: If the card database cannot be reached, System MUST show a clear, actionable
  message and MUST NOT write any partial or incomplete result to the backlog or a tracker.
- **FR-009**: Users MUST be able to tell how many cards a simulated pull produced and confirm
  that total is consistent with the requested pack count.

### Key Entities

- **Card Set**: A real, published Yu-Gi-Oh card set from the existing card database; has a name,
  an original release date (used for chronological ordering), and a pool of real cards each with
  a rarity.
- **Simulated Pull**: A system-generated pull (see the existing Pull entity from the Progression
  Series Pack Puller feature) whose card names were randomly drawn from a selected Card Set's
  pool rather than typed in by the user; otherwise behaves identically to a manual pull once
  logged (same backlog effect, same tracker-progress effect).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of simulated pulls produce a card count consistent with the requested number
  of packs.
- **SC-002**: 100% of cards produced by a simulated pull are drawn only from the selected set's
  real card pool — never a card that doesn't belong to that set.
- **SC-003**: A user can locate a specific real card set in the chronological picker in under 15
  seconds.
- **SC-004**: When the card database is unavailable, 100% of attempted simulated pulls fail
  safely — a clear message is shown, and neither the backlog nor any tracker reflects a partial
  result.

## Assumptions

- This feature extends the existing Progression Series Pack Puller (its Tracker and Pull
  concepts) and the shared Backlog; a simulated pull is a second way of producing a Pull's card
  list, alongside the existing manual (typed) entry — both continue to coexist, neither replaces
  the other.
- "The YGO api" refers to the same external card database this app already calls elsewhere
  (used today for card search in the Proxy Sheet Builder); this feature reuses that same source
  rather than introducing a second card-data provider.
- Rarity weighting is an approximation of real pack odds (commons weighted far more likely than
  rare-tier cards), not an exact reproduction of official print-run odds, since exact slot-by-
  slot odds are not public/standardized data. This is documented to the user as an approximation,
  not presented as officially accurate.
- A simulated "pack" is treated as a standard modern count of real cards (9) for the purpose of
  computing how many total cards a requested number of packs should produce; this is a
  simplification, since pack sizes have varied across Yu-Gi-Oh's print history and the exact
  historical count for every set is not assumed to be available.
- "Chronological order" orders the set picker itself; it does not mean the system automatically
  forces the user through sets in sequence or auto-advances when a set is "exhausted" — ordinary
  card sets, unlike a Progression Series box, have no fixed, finite pack count. The user chooses
  which set to pull from each time, with the picker simply making it easy to proceed in release
  order at their own pace.
- Fetched set/card/rarity data is cached only for the current session (in memory), not
  necessarily persisted long-term; re-opening the app may re-fetch a previously used set.
- This feature reintroduces a real-time network dependency for the pages it touches (unlike the
  rest of the Draft Collection Manager and Progression Series Pack Puller, which work fully
  offline); it is scoped so that dependency is isolated to the simulated-pull action itself and
  does not affect manual pull logging, backlog management, or any other existing offline-capable
  functionality.
