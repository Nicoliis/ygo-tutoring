# Feature Specification: Card Tag Interactions

**Feature Branch**: `004-card-tag-interactions`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "the lists to build decks and engines should be \"flex tags with
cards name in fixed sizes\" when hovered they should show entire name and most important card
info, when clicked it should expand to an image of the card, when card is clicked again it shows
a modal with all card info and image. the adding to different engines and decks is done by
dragging. the removing should also have a modal. the app should be usable without typing."

## Clarifications

### Session 2026-10-06

- Q: What should happen when the card database can't be reached while the user is searching for
  and adding a new card to the backlog? → A: Fail safely, same pattern as the Set Pack Simulator
  — show a clear error message, add nothing, leave the backlog untouched; the user can retry.
- Q: Should the new removal modal extend to removals that have no confirmation at all today
  (removing one card from inside an engine, one item from inside a deck, one checklist entry), or
  only upgrade removals that already have a browser `confirm()` today? → A: Extend to every
  removal this feature touches, so removal behaves consistently everywhere.
- Q: Can multiple card tags be image-expanded at the same time, or does expanding one
  automatically collapse whichever other tag was previously expanded? → A: Only one at a time
  (accordion-style) — keeps lists compact, consistent with this project's established priority of
  avoiding page-level scrolling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse cards as compact, inspectable tags (Priority: P1)

A user looking at their backlog, or at an engine's or a deck's contents, wants every card to
appear as a small, uniform, fixed-size tag showing just its name — so a list of many cards stays
compact and scannable instead of a tall list of rows. They want to hover a tag to see its full
name and the handful of details that actually matter without committing to anything, click once
to see the card's actual image in place, and click again when they want the complete picture
(every detail, full image) in a dedicated view.

**Why this priority**: This is the foundational display change everything else in this feature
builds on — engines/decks can't be dragged onto or removed via a modal until cards are
represented as the tags this spec describes.

**Independent Test**: Can be fully tested by viewing a backlog with several cards, confirming
each renders as a same-size tag, hovering one to see its full name/key info, clicking it once to
see its image, and clicking it again to see the full-detail view.

**Acceptance Scenarios**:

1. **Given** a list of cards (backlog, an engine's contents, or a deck's contents), **Then**
   every card renders as a tag of the same fixed size, showing the card's name regardless of how
   long that name is (long names are truncated within the tag rather than resizing it).
2. **Given** a card tag, **When** the user hovers it, **Then** its full name and its key details
   are shown without clicking or navigating away.
3. **Given** a card tag, **When** the user clicks it once, **Then** it expands in place to show
   the card's image.
4. **Given** a card tag already showing its image, **When** the user clicks it again, **Then** a
   modal opens showing the card's complete details and image.
5. **Given** the user wants to add a new card to the backlog, **When** they search the card
   database and click a result, **Then** that real card (with its image and details already
   available) is added to the backlog — no typing beyond an optional search phrase is required
   to identify which card they mean.

---

### User Story 2 - Add cards to engines and decks by dragging (Priority: P2)

A user with cards in their backlog wants to drag a card tag directly onto an engine or a deck to
add it there, instead of using a separate picker/form, so building a bundle or a deck feels
direct: see the card, drag it where it belongs.

**Why this priority**: This depends on Story 1's tags existing (there's nothing to drag until
cards are discrete, draggable tags), and is the feature's second major request after the visual
redesign.

**Independent Test**: Can be fully tested by dragging a backlog card tag onto an existing engine
and onto an existing deck, and confirming each gains that card exactly as the existing
form-based add already does.

**Acceptance Scenarios**:

1. **Given** a backlog card tag and an existing engine, **When** the user drags the tag onto the
   engine, **Then** the card is added to that engine (or its quantity increases if already
   present), exactly as the existing add action would.
2. **Given** a backlog card tag and an existing deck, **When** the user drags the tag onto the
   deck, **Then** the card is added to that deck's contents, exactly as the existing add action
   would.
3. **Given** a user dragging a card tag, **When** they drop it somewhere that is not a valid
   engine or deck target, **Then** nothing changes and the card stays in its original place.

---

### User Story 3 - Confirm removals through a modal (Priority: P3)

A user removing a card or entry — from the backlog, an engine, a deck, or a tracker's checklist —
wants a clear, in-app confirmation showing exactly what they're about to remove, replacing the
plain browser confirmation popup used today.

**Why this priority**: Valuable on its own and independent of Stories 1-2, but lowest priority —
for the removals already guarded today (by a browser `confirm()`) this is a consistency/polish
upgrade, though it also adds a genuinely new safeguard to removals that have no confirmation at
all today (a single card from inside an engine, a single item from inside a deck, a checklist
entry).

**Independent Test**: Can be fully tested by initiating a removal in each affected list and
confirming a modal (not a browser popup) names the specific item before anything is deleted.

**Acceptance Scenarios**:

1. **Given** a user initiates removing a card, entry, or item, **Then** a modal opens naming the
   specific thing about to be removed and asking for confirmation.
2. **Given** that modal is open, **When** the user cancels, **Then** nothing is removed and the
   modal closes.
3. **Given** that modal is open, **When** the user confirms, **Then** the item is removed exactly
   as it would have been before this feature.

---

### Edge Cases

- What happens when a card has no available image (e.g. not yet loaded, or lookup failed)?
- What happens to cards already in the backlog from before this feature (added as plain
  free-text names, with no database match at all)?
- What happens when hover/click interactions are attempted on a touch device, which has no true
  hover state?
- What happens when a card tag is clicked a third time, after its modal has already been opened
  and closed once — does it return to collapsed, or stay image-expanded?
- What happens when a drag gesture is cancelled or interrupted partway (e.g. released outside the
  browser window)?
- What happens when the user needs to add/remove a card but cannot perform a drag gesture (e.g.
  keyboard-only navigation, or an assistive input device)?
- What happens when the card database cannot be reached while the user is searching for or
  adding a new card? (resolved — see Clarifications)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every card shown in the backlog, an engine's contents, or a deck's contents MUST be
  displayed as a fixed-size tag showing, at minimum, the card's name.
- **FR-002**: Hovering a card tag MUST reveal that card's full name and its key details without
  requiring a click.
- **FR-003**: Clicking a card tag once MUST expand it in place to show that card's image. Only
  one card tag may be image-expanded at a time across the whole page — expanding a new tag MUST
  collapse whichever other tag was previously expanded.
- **FR-004**: Clicking an already image-expanded card tag MUST open a modal showing that card's
  complete details and image.
- **FR-005**: Users MUST be able to add a backlog card to an engine or a deck by dragging its tag
  onto that engine or deck. This MUST supplement, not replace, the existing form/picker-based
  "add to engine" / "add to deck" controls — both ways of adding a card remain available side by
  side.
- **FR-006**: Every drag-based action introduced by this feature MUST have an equivalent
  non-drag way to achieve the same result (satisfied by FR-005's "supplement, not replace" rule —
  the pre-existing add controls are that equivalent), so no action requires a drag gesture to be
  reachable.
- **FR-007**: Removing a card, entry, or item MUST show an in-app modal naming the specific item
  before it is removed. This applies consistently to **every** removal action this feature
  touches, not only the ones that already have a browser `confirm()` today — specifically:
  removing a card from the backlog; deleting a whole engine, deck, or tracker (today's
  `confirm()`-guarded actions, upgraded to a custom modal); **and** removing a single card from
  inside an engine's contents, a single item from inside a deck's contents, and a single
  checklist entry (today unconfirmed, newly gaining a modal by this requirement).
- **FR-008**: Making every core action (searching for and selecting cards, adding cards to
  engines/decks, building out the backlog) completable via pointing, clicking, and dragging alone
  is this feature's guiding design philosophy and main focus, not an absolute prohibition on
  typing everywhere in the app — naming something the user creates (an engine, a deck, a
  tracker), and free-text screens outside this feature's scope (the Progression Series Pack
  Puller's checklist entry and pull-logging text areas), may still involve typing.
- **FR-009**: Backlog cards MUST be real cards looked up from the same external card database
  the Proxy Sheet Builder (`app.js`) and the Set Pack Simulator (`tracker.js`) already call, not
  arbitrary free-text names. Adding a new card to the backlog MUST be done by searching that
  database and selecting a result (mirroring the Proxy Sheet Builder's existing search-and-click
  pattern), rather than typing a card's name directly. Each card's image and "key details" /
  "complete details" (FR-002, FR-004) are sourced from that same lookup.
- **FR-010**: If the card database cannot be reached while the user is searching for or adding a
  new card, System MUST show a clear, actionable message and MUST NOT add any card or partial
  result to the backlog — matching the Set Pack Simulator's established fail-safe pattern for the
  same kind of failure.

### Key Entities

- **Card Tag**: The compact, fixed-size visual representation of one card wherever cards are
  listed (backlog, engine contents, deck contents); has at least a name, and an interaction state
  (collapsed / image-expanded).
- **Card Detail**: The fuller set of information — key details shown on hover, and complete
  details plus image shown in the modal — associated with a card, looked up from the external
  card database per FR-009.
- **Removal Confirmation**: A modal naming the specific card/entry/item a removal action targets,
  shown before that removal takes effect.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can visually scan a list of 20+ cards and identify a specific one without
  any card changing size or shifting the layout as the user looks through them.
- **SC-002**: A user can view a card's image and its key details without leaving the current page
  or opening a new view (hover and single-click only).
- **SC-003**: A user can add a card to an engine or a deck in a single drag gesture, with no
  typing involved.
- **SC-004**: 100% of removal actions show a confirmation naming the specific item before
  anything is deleted — zero removals happen without that confirmation.
- **SC-005**: Every action introduced by this feature remains completable by a user who cannot
  perform drag gestures or hover (e.g. keyboard-only or touch-only use).
- **SC-006**: When the card database is unavailable, 100% of attempted card searches/additions
  fail safely — a clear message is shown, and the backlog reflects no partial or incomplete
  result.

## Assumptions

- This feature's scope is the Draft Collection Manager's Backlog, Engines, and Decks lists
  (`collection.html`/`collection.js`) — the Progression Series Pack Puller's checklist and pull
  history (`tracker.js`) are plain free-text lists not explicitly called out by this request, and
  are out of scope for the tag/drag/image redesign, except that FR-007's removal-modal
  requirement explicitly extends to the tracker's checklist, since the request names "removing"
  generically and the checklist is this app's other clear "remove an entry" interaction.
- "Most important card info" shown on hover means a small, fixed set of fields appropriate to the
  card's type (e.g. Monster/Spell/Trap, and for Monsters, level/rank and ATK/DEF) — not the full
  detail set, which is reserved for the modal.
- A card tag's interaction state is: collapsed → image-expanded (first click) → modal open
  (second click). Closing the modal returns the tag to the image-expanded state, not back to
  collapsed; clicking outside an image-expanded tag collapses it back down. Only one tag across
  the whole page is ever image-expanded at a time (FR-003); expanding a different tag collapses
  whichever one was previously expanded, so this is independent per container but exclusive
  page-wide.
- On touch devices (no true hover), the first tap serves the role hover plays on desktop (showing
  key details alongside the expanding image), and a second tap opens the modal — preserving the
  same three-step progression without requiring a hover state that doesn't exist on touch.
- The removal modal's content is a simple, consistent pattern across every removal context this
  feature touches (backlog card; whole engine/deck/tracker deletion; a single card removed from
  inside an engine; a single item removed from inside a deck; a single checklist entry): name/
  identify the specific item, then Cancel/Confirm.
- This feature supersedes the Draft Collection Manager's original "no live external card-database
  lookup is required... though it may reuse one if convenient" assumption: backlog cards are now
  real, database-backed cards, added via search-and-select rather than typing a name — a
  deliberate, scoped evolution of that earlier assumption, resolved via this feature's
  clarification rather than left ambiguous.
- Cards already in the backlog from before this feature (plain free-text names with no database
  match) are not blocked or migrated automatically; they display in their tag with a graceful
  "no image available" state until/unless the user re-adds the equivalent real card through the
  new search-and-select flow. No automatic fuzzy-matching or backfill is performed.
- "Usable without typing" (the request's closing line) is treated as this feature's guiding
  design philosophy, not a literal, absolute rule enforced on every input in the app: the
  resolved FR-008 scopes it to core actions (search, select, add, build), while naming
  user-created things (engines, decks, trackers) and the Pack Puller's inherently free-text
  screens may still involve typing.
