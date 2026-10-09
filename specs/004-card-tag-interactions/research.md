# Phase 0 Research: Card Tag Interactions

No item in the plan's Technical Context carries a `NEEDS CLARIFICATION` marker (all were
resolved during `/speckit-specify` and `/speckit-clarify`). This document records the remaining
technical decisions and why.

## Decision: Reuse `app.js`'s exact search pattern for the backlog's add flow

- **Decision**: The backlog's new search-and-select add control calls
  `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=<query>` with the same debounce (400ms),
  minimum query length (3 characters), and `AbortController`-based stale-request cancellation
  `app.js` already implements for the Proxy Sheet Builder's search.
- **Rationale**: FR-009 explicitly says to mirror the Proxy Sheet Builder's existing
  search-and-click pattern. Reusing the exact constants and cancellation approach keeps behavior
  consistent across the app and satisfies Constitution Principle II without new design work —
  this pattern is already proven in this codebase.
- **Alternatives considered**: A different debounce interval or no minimum length was rejected —
  there's no reason for the two search boxes in this app to behave differently, and `app.js`'s
  values are already tuned (documented in its own constitution-driven history).

## Decision: Looked-up card data is captured once, at add-time, into `OwnedCard` itself

- **Decision**: When a user selects a search result, the fields needed for the tag/hover/modal
  views (image URLs, type, and for Monsters: level, ATK, DEF) are copied directly onto that
  backlog entry's own record and persisted — not kept in a separate session cache, and never
  re-fetched afterward to render that card again.
- **Rationale**: This is a stronger guarantee than the Set Pack Simulator's in-memory session
  cache (research.md there): since a backlog card is added once and then displayed
  indefinitely, persisting its looked-up data at add-time means **zero** network calls are ever
  needed again for that card, in this session or any future one. This is the simplest possible
  way to satisfy Constitution Principle II for a feature whose core display (tags, hover,
  expand, modal) is read far more often than cards are added.
- **Alternatives considered**: A session-only cache (mirroring the Set Pack Simulator's pattern)
  was considered, but rejected — it would mean re-fetching every backlog card's data again on
  every page reload (hundreds of cards, in the worst case), which is strictly worse than a
  one-time, persisted lookup for data that never changes once a card is added.

## Decision: A single shared "render a card tag" helper, parameterized by card + interaction state

- **Decision**: One function builds a card tag's markup and wires its hover/click/drag behavior,
  taking the `OwnedCard` (or an engine/deck reference resolved to one) and the current
  expanded/collapsed state as parameters. It's called from `renderBacklog()`, `renderEngines()`'s
  contents loop, and `renderDecks()`'s item/resolved-list loops alike.
- **Rationale**: FR-001 requires the *same* fixed-size tag behavior everywhere cards appear.
  Building it once and calling it from every list avoids the three call sites drifting out of
  sync with each other over time (Constitution Principle III) — a direct lesson from how
  `collection.js`'s engine/deck collapse pattern was already written once and reused.
- **Alternatives considered**: Separate, list-specific tag rendering (one per list) was rejected
  as needless duplication of markup, event wiring, and (critically) the single page-wide
  "only one tag expanded at a time" rule, which is far easier to get right in one place.

## Decision: A single shared "show a modal" helper, reused for card details and every removal

- **Decision**: One function opens a focus-trapped, Escape-dismissible modal given a title, a
  body (HTML or a render callback), and a list of buttons with their actions. The card-detail
  view and all six removal-confirmation contexts (backlog card; whole engine/deck/tracker;
  single card from an engine; single item from a deck; a checklist entry) call it with different
  content, not different modal implementations.
- **Rationale**: Directly serves Constitution Principle I (every modal is keyboard-operable the
  same, correct way, built once) and Principle III (one implementation to maintain, not seven).
- **Alternatives considered**: Bespoke per-action confirm dialogs were rejected as exactly the
  kind of drift multiple ad-hoc implementations invite — and as the harder path to get keyboard
  accessibility right seven separate times instead of once.

## Decision: `tracker.js` gets its own, independent copy of the modal helper

- **Decision**: Since FR-007's removal-modal requirement extends to the Progression Series Pack
  Puller's checklist entries, `tracker.js` needs the same modal behavior — implemented as its
  own small, separate function, not an import from `collection.js`.
- **Rationale**: Matches this project's standing rule, established when the Draft Collection
  Manager and the Progression Series Pack Puller were first split into separate pages: "the two
  pages share no runtime code or build tooling." A few dozen duplicated lines is the accepted
  cost of that rule, already paid once for `nextId`/`addOrIncrementCard`-style helpers.
- **Alternatives considered**: Introducing a shared script loaded by both pages was rejected
  again here, for the same reason it was rejected when the Set Pack Simulator considered it: it
  would be the project's first cross-page shared runtime file, a bigger structural change than
  one small modal helper justifies.

## Decision: Native HTML5 Drag and Drop API, no library

- **Decision**: Card tags get `draggable="true"`; engine and deck containers listen for
  `dragover` (to allow a drop and show drop-zone feedback) and `drop` (to perform the add).
- **Rationale**: The browser's built-in Drag and Drop API needs no dependency and is sufficient
  for this feature's scope (dragging a tag onto a clearly-bounded container); adding a library
  would violate Constitution Principle III's "no dependency unless justified" for a need this
  simple.
- **Alternatives considered**: A pointer-events-based custom drag implementation (for finer
  control or touch support) was rejected as unjustified complexity — native HTML5 drag already
  does what FR-005 asks for, and touch users have the equivalent, unaffected click-based add path
  (FR-006) regardless, since native HTML5 drag-and-drop doesn't work on touch anyway.

## Decision: Each drop adds exactly one copy; quantity is adjusted afterward via existing controls

- **Decision**: Dropping a card tag onto an engine or a deck adds 1 copy of that card (or
  increments its existing quantity there by 1), matching the Proxy Sheet Builder's own
  one-click-one-copy precedent (`app.js`'s `addCard`).
- **Rationale**: A single dragged tag representing a single conceptual unit, with quantity
  increased by dragging again (or via the existing quantity inputs the form-based path already
  has), is the simplest mental model and needs no new UI (a quantity prompt mid-drag) that would
  complicate the gesture FR-005 asks for. For decks, this reuses `addItemToDeck`, which already
  adds one card/quantity at a time; for engines, no equivalent incremental single-card mutation
  exists today (only `updateEngine`'s bulk `cards`-array replace does), so this decision requires
  a new `addCardToEngine` helper that performs the increment-or-append internally before calling
  `updateEngine` — see tasks.md T015.
- **Alternatives considered**: Prompting for a quantity during the drop was rejected as adding
  a modal/typing step to the one interaction this feature explicitly wants to be a single,
  typing-free gesture (FR-008's philosophy, SC-003).
