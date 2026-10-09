# Feature Specification: Draft Collection Manager

**Feature Branch**: `001-draft-collection-manager`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "Build an app that simplifies the tracking of owned card in \"draft\" formats, the ones with continous drafts that allows your deck to have accidental engines like \"the progression series\" So, easy access to backlog, capacity to make multiple bundle \"engines\", capacity to make multiple decks and export them."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track the owned-card backlog (Priority: P1)

A player who regularly joins continuous draft events accumulates cards over many sessions.
They need one place to log what they own and to see that whole pool (the "backlog") at a
glance, so they always know what they have available to build with before starting a new
deck.

**Why this priority**: Without a reliable backlog, nothing else in the app (engines, decks,
exports) has accurate source data. This is the foundation every other story depends on.

**Independent Test**: Can be fully tested by adding cards (by name and quantity) after a draft
session and confirming they appear, searchable, in the backlog view — delivers value on its
own even before any engine or deck exists.

**Acceptance Scenarios**:

1. **Given** an empty backlog, **When** the user adds a card with a name and quantity, **Then**
   the card appears in the backlog showing that quantity as owned and unallocated.
2. **Given** a backlog with many cards, **When** the user searches/filters by name, **Then**
   only matching cards are shown.
3. **Given** a card already in the backlog, **When** the user adds more copies of it, **Then**
   the owned quantity increases rather than creating a duplicate entry.

---

### User Story 2 - Bundle synergistic cards into reusable "engines" (Priority: P2)

Draft pools often reward recognizing a recurring synergy package (e.g. "the progression
series") spread across several individually-owned cards. The user wants to name that package
once, as an "engine," so it can be reused as a unit across multiple decks instead of
re-assembling it from memory every time.

**Why this priority**: Engines are the feature's key differentiator over a plain card list, but
they build on top of the backlog from Story 1, so they are second in priority.

**Independent Test**: Can be fully tested by selecting two or more backlog cards, saving them as
a named engine, and confirming the engine can be viewed, renamed, and deleted independently of
any deck.

**Acceptance Scenarios**:

1. **Given** at least two cards in the backlog, **When** the user groups them under a new
   engine name, **Then** a new engine is created containing those cards and quantities.
2. **Given** an existing engine, **When** the user renames it or removes a card from it,
   **Then** the change is reflected without affecting other engines.
3. **Given** multiple engines exist, **When** the user views the engine list, **Then** each
   engine is listed distinctly by name with a summary of its size (card types / total copies),
   and its full card contents are shown on demand (expanding that engine) rather than all at
   once, so a list of many engines stays scannable.

---

### User Story 3 - Build multiple decks and export them (Priority: P3)

Once cards and engines are organized, the user wants to assemble several independent decks —
mixing individual backlog cards with whole engines — and export each finished deck so it can be
shared or used outside the app.

**Why this priority**: Deck-building and export are the end goal of the workflow, but they
depend on the backlog (Story 1) and benefit from engines (Story 2), so they come last.

**Independent Test**: Can be fully tested by creating a new deck, adding backlog cards and/or an
engine to it, and exporting it to confirm a complete, correctly listed output is produced.

**Acceptance Scenarios**:

1. **Given** cards exist in the backlog, **When** the user creates a new deck and adds cards
   and/or an engine to it, **Then** the deck's combined, correctly totaled card list is
   available on demand (expanding that deck), with a summary (card types / total copies) always
   visible even when collapsed, so a list of many decks stays scannable.
2. **Given** multiple decks exist, **When** the user edits or deletes one deck, **Then** the
   other decks remain unchanged.
3. **Given** a completed deck, **When** the user exports it, **Then** a complete list of the
   deck's cards and quantities is produced in a form the user can save or share.

---

### Edge Cases

- What happens when the user tries to add a card or engine to a deck in a quantity greater than
  what the backlog currently shows as owned?
- How does the system handle two engines that both reference the same underlying card — is the
  card's "used" count combined across engines, or are engines independent templates?
- What happens when the user deletes an engine or a backlog card that is already included in one
  or more existing decks?
- What happens when the user exports a deck that has zero cards in it?
- How are cards with identical names but meant to be tracked as distinct items (e.g. different
  owned prints) handled — are they merged into one backlog entry or kept separate?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add a card to their backlog by name and quantity.
- **FR-002**: Users MUST be able to increase or decrease the owned quantity of an existing
  backlog card, and remove a card from the backlog entirely.
- **FR-003**: Users MUST be able to search or filter the backlog by card name.
- **FR-004**: Users MUST be able to create a named "engine" bundle from two or more backlog
  cards, each with its own quantity within the engine.
- **FR-005**: Users MUST be able to create, rename, edit the contents of, and delete multiple
  engines independently of one another.
- **FR-006**: Users MUST be able to create, rename, and delete multiple independent decks.
- **FR-007**: Users MUST be able to add individual backlog cards and/or whole engines to a deck,
  and remove them again.
- **FR-008**: System MUST show, for each backlog card, how much of its owned quantity is
  currently allocated across engines/decks versus still unallocated, so the user does not lose
  track of what is actually available.
- **FR-009**: Users MUST be able to export a deck's full card list (names and quantities) in a
  form that can be saved or copied outside the app.
- **FR-010**: System MUST persist the backlog, all engines, and all decks across browser
  sessions without requiring an account or login.
- **FR-011**: Editing or deleting one deck or one engine MUST NOT alter the contents of any other
  deck or engine.

### Key Entities

- **Owned Card**: A card the user owns from draft sessions; identified by name, with a tracked
  owned quantity and a derived unallocated quantity.
- **Backlog**: The complete, searchable collection of all Owned Cards not yet fully committed
  elsewhere; the single source of truth for what is available to build with.
- **Engine**: A user-named, reusable bundle of two or more Owned Cards (with per-card
  quantities) representing a recognized synergy package, usable across multiple decks.
- **Deck**: A user-named construction composed of Owned Cards and/or Engines, which can be
  exported as a complete card list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log newly drafted cards into the backlog in under 10 seconds per card.
- **SC-002**: A user can find any specific owned card in the backlog in under 15 seconds, even
  with hundreds of cards logged.
- **SC-003**: A user can assemble a new engine from existing backlog cards in under 2 minutes.
- **SC-004**: A user can build a complete new deck from existing backlog cards and engines in
  under 5 minutes.
- **SC-005**: 100% of decks the user chooses to export produce a complete, correctly totaled
  card list with no missing entries.
- **SC-006**: A user can maintain 5 or more concurrently active decks and 5 or more engines
  without losing track of which owned cards are already allocated.

## Assumptions

- This is a single-user, local tool: no accounts, login, or multi-device sync are required;
  data persists locally in the browser, consistent with the project's existing client-side-only
  constraint.
- "Draft formats" refers to recurring/continuous draft events where the user's owned card pool
  grows incrementally over time, rather than a single one-time draft; the backlog is a single,
  cumulative pool across all such sessions rather than separated per individual draft event.
- Allocating a card to an engine or a deck is a planning/organizational aid, not a hard physical
  reservation: the system tracks and displays allocation so the user can see what's "spoken for,"
  but does not block over-allocation outright (see FR-008); it warns rather than hard-blocks,
  since the same physical cards may be reshuffled between paper decks between play sessions.
- Engines are fully user-defined bundles (not a pre-built library of named archetypes); "the
  progression series" is an example of the kind of bundle a user would create, not a built-in
  template the app ships with.
- Deck export produces a plain, human-readable text list (card names and quantities) that the
  user can copy or download; it does not need to integrate with any specific external tool.
- Card names are free-text entries; no live external card-database lookup is required for this
  feature, though it may reuse one if convenient.
