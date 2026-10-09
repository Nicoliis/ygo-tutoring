# Feature Specification: Collection Bags & Deck Export

**Feature Branch**: `006-collection-bags-export`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "1- in the backlog the image does not load and i cant click to see
effect, level, atk, def, type,... (etc, etc,). 2- the engines should be a simple bag to hold the
cards i place in there, with one click it will shrink to it's name, in one click expands to show
all cards in there (same element as backlog). 3- In deck should be a bag, only separating deck and
extradeck should take cards and have a export/import/copytoclipboard, that copies the ymk"

## Clarifications

### Session 2026-10-08 (specify-phase)

- Q: When a card is added to a deck one at a time, how is Main vs. Extra Deck decided? → A: Manual
  choice — the user drags onto (or explicitly picks) the section; the system never overrides it.
- Q: When importing YDK text that references a card not in the backlog, should import fetch it
  from the database automatically? → A: No — skip it and report it; import never triggers a new
  network call.
- Q: Must creating an engine still require picking ≥2 cards up front? → A: No — naming it is
  enough; it starts empty and is populated afterward by dragging cards in.

### Session 2026-10-08 (clarify-phase)

- Q: Should a deck's raw item list also be split into Main/Extra sections, or only the resolved
  card list? → A: Don't split the question this way — engines are groups of cards that work
  together; when an engine is added to a deck, its cards are added as individual cards, not as a
  tracked engine reference. (This removes the engine-reference-spans-both-sections problem
  entirely — every deck item is a plain card, so the single item list can just be split by
  section directly.)
- Q: Should engines keep a bulk checkbox-picker Edit flow? → A: No checkbox — drag to add, drag to
  a bin to remove. Composition is managed entirely by dragging; Edit becomes rename-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every backlog card shows its real details, not just new ones (Priority: P1)

A user looking at a card in their backlog — whether it was added through the search-and-select
flow or is a card that was already in their backlog from before that flow existed — expects
hovering or clicking it to show its image and details (type, level, ATK/DEF, and its card text)
exactly the same way for every card. Today, only cards added via the newer search flow carry that
data; older cards show no image and nothing happens with useful information when clicked, which
reads as broken.

**Why this priority**: This is a defect in behavior users already rely on (viewing card details) —
fixing it restores trust in the backlog view itself, and is a prerequisite for the bag redesigns
below actually being useful (a bag full of cards with no visible detail is not a useful bag).

**Independent Test**: Can be fully tested by viewing a backlog card that predates the search-based
add flow (added by name only, with no stored image/type data) and confirming that hovering or
clicking it now fetches and displays its real image and details, exactly as an already-enriched
card does — without duplicating the card or changing its owned quantity.

**Acceptance Scenarios**:

1. **Given** a backlog card with no previously stored image/type/level/ATK/DEF/card-text data,
   **When** the user hovers or clicks its tag for the first time, **Then** the system looks that
   card up by name, and once found, displays its image and details exactly as a card added via
   search already does.
2. **Given** that same card after its details have been successfully looked up once, **When** the
   user views it again (including after reloading the page), **Then** its image and details are
   already there with no further lookup needed.
3. **Given** a backlog card whose name doesn't match any real card in the database (or the lookup
   fails because the database is unreachable), **When** the user hovers or clicks it, **Then** it
   shows the existing graceful "no image available" / "no further details" fallback — the same
   fallback already shown today — rather than an error, and the system does not keep retrying that
   same lookup on every subsequent hover or click within the same page view.
4. **Given** a card's full detail view (opened by a second click, per the existing behavior),
   **When** the lookup has found a real database match, **Then** the view also shows the card's
   effect/description text, which is not shown anywhere in the product today.

---

### User Story 2 - Engines behave as simple, clickable bags (Priority: P2)

A user looking at their engines wants each one to behave like a simple bag: collapsed, it shows
just its name; clicking it (anywhere on it, not a small separate control) expands it to show every
card inside, each displayed exactly like a card in the backlog; clicking it again collapses it back
down to just its name.

**Why this priority**: Depends on Story 1 (a bag of cards is only useful once those cards show
real detail), and is a direct, scoped interaction simplification requested after that fix.

**Independent Test**: Can be fully tested by creating an engine, clicking anywhere on its collapsed
form to expand it and see its cards (rendered the same way backlog cards are), and clicking it
again to collapse it back to showing just its name.

**Acceptance Scenarios**:

1. **Given** a collapsed engine, **Then** it displays only its name.
2. **Given** a collapsed engine, **When** the user clicks anywhere on it, **Then** it expands to
   show every card currently inside it, each rendered the same way a backlog card is (same
   fixed-size tag, hover/click/detail behavior).
3. **Given** an expanded engine, **When** the user clicks anywhere on its visible header/bag area
   (not one of the cards inside it), **Then** it collapses back to showing just its name.
4. **Given** an expanded engine, **When** the user drags a backlog card onto it, **Then** the card
   is added to it exactly as dragging onto an engine already works today.
5. **Given** an expanded engine, **When** the user drags one of its cards onto a visible "remove"
   bin, **Then** that card is removed from the engine (and an equivalent non-drag control, usable
   without a mouse, is also available for the same removal).
6. **Given** an engine, **When** the user wants to change its name, **Then** an Edit-equivalent
   control lets them rename it; it no longer offers a bulk, checkbox-based way to replace the
   engine's whole card list.

---

### User Story 3 - Decks are bags split into Main Deck and Extra Deck, with YDK export/import (Priority: P3)

A user building a deck wants it to behave like the same kind of bag as an engine — collapsed to
its name, expanding to show its contents — but split into two parts, a Main Deck and an Extra
Deck, each of which can take cards. They also want to export their deck (and copy it to the
clipboard) in the standard YDK deck-file format other Yu-Gi-Oh tools use, and import a deck from
that same format.

**Why this priority**: Builds on the same bag interaction as Story 2, plus adds a genuinely new
capability (structured export/import) that depends on cards already carrying real database detail
(Story 1) to produce a valid, standard deck file.

**Independent Test**: Can be fully tested by adding cards to a deck's Main and Extra sections,
collapsing/expanding the deck bag, exporting it to see valid YDK-format text (and confirming it
was copied to the clipboard), and importing that same text back into a new deck and confirming its
Main/Extra contents match.

**Acceptance Scenarios**:

1. **Given** a collapsed deck, **Then** it displays only its name; clicking it expands it to show
   its Main Deck and Extra Deck sections, each listing its cards the same way a backlog card is
   shown.
2. **Given** an expanded deck, **When** the user drags a single backlog card onto its Main Deck
   section or its Extra Deck section, **Then** that card appears only in the section it was
   dropped on, as a plain card entry.
3. **Given** an expanded deck, **When** the user drags an entire engine (bag) onto its Main Deck
   section or its Extra Deck section, **Then** every card currently inside that engine is added to
   the section it was dropped on, each as its own plain card entry — the deck never tracks "this
   engine" as a single reference; it only ever holds individual cards.
4. **Given** a card inside a deck section, **When** the user drags it onto a visible "remove" bin,
   **Then** it is removed from that section (and an equivalent non-drag control is also available
   for the same removal).
5. **Given** a deck with cards in both sections, **When** the user chooses Export, **Then** the
   deck's contents are produced as standard YDK-format text, that text is copied to the clipboard,
   and the user can also save it as a file.
6. **Given** valid YDK-format text (previously exported from this app, or from another compatible
   tool, for cards that exist in the user's backlog), **When** the user imports it, **Then** a deck
   is created or replaced with Main/Extra contents matching that text.
7. **Given** YDK text that references a card not found in the user's backlog, **When** the user
   imports it, **Then** that specific card is skipped with a clear message listing what was
   skipped, and the rest of the import still completes.

---

### Edge Cases

- What happens when a backlog card's on-demand lookup (Story 1) is still in progress when the user
  clicks to see the full detail view? The detail view shows a loading state until the lookup
  settles, then updates — the click itself is never lost or ignored.
- What happens when an engine or deck is expanded and the user starts dragging a card over it —
  does it stay expanded? Yes; expand/collapse is only ever triggered by a direct click on the
  bag's own header/body area, never as a side effect of a drag gesture passing over it.
- What happens to a deck created before this feature (with a flat, unsplit card/engine list, no
  Main/Extra distinction)? It is treated as entirely Main Deck content on first view under the new
  design — nothing is deleted, but the user may need to manually move cards into the Extra Deck
  section where appropriate.
- What happens when an engine is dropped onto a deck's Main or Extra Deck section? Every card
  currently inside that engine is added to the section it was dropped on, each as its own plain
  card entry (incrementing quantity if already present) — not as a tracked reference to the
  engine. Changing the engine afterward has no effect on cards already added to the deck this way.
- What happens if an engine is empty (no cards) when dropped onto a deck? Nothing is added — same
  as dropping zero cards.
- What happens when YDK import text is malformed or empty? A clear message is shown and nothing is
  created or changed — same fail-safe pattern already used elsewhere in this app for bad input.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hovering or clicking a backlog card tag that has no previously stored database
  details MUST trigger an on-demand lookup of that card by name, reusing the same debounced,
  cached lookup approach already used when adding a card via search.
- **FR-002**: Once an on-demand lookup succeeds, the card's image, type, level, ATK/DEF, and
  effect/description text MUST be stored on that backlog entry (without duplicating it or changing
  its owned quantity) and displayed exactly as an already-enriched card's details are.
- **FR-003**: If an on-demand lookup fails or finds no match, the card MUST continue showing
  today's graceful "no image available" / "no further details" fallback, and MUST NOT be
  re-attempted again within the same page view once it has failed once.
- **FR-004**: The full card detail view MUST include the card's effect/description text when
  available, in addition to the fields it already shows (type, level, ATK/DEF, image).
- **FR-005**: An engine MUST display, by default, only its name (collapsed state).
- **FR-006**: Clicking anywhere on a collapsed engine's visible area MUST expand it to show every
  card currently inside it, each rendered using the same card-tag component used in the backlog.
- **FR-007**: Clicking anywhere on an expanded engine's header/bag area (excluding the individual
  cards and controls inside it) MUST collapse it back to showing only its name.
- **FR-008**: A deck MUST follow the same collapsed-to-name / click-to-expand behavior as an
  engine (FR-005/FR-006/FR-007), and its expanded view MUST show two distinct sections: Main Deck
  and Extra Deck.
- **FR-009**: When a user adds a single card to a deck — by dragging it onto the Main Deck section
  or the Extra Deck section specifically, or by choosing the section explicitly in the existing
  non-drag add control — that choice (not the card's own type) determines which section it lands
  in; the system does not override or second-guess which section the user chose.
- **FR-010**: Dragging an entire engine onto a deck's Main Deck or Extra Deck section MUST add
  every card currently inside that engine to the section it was dropped on, each as an individual
  plain card entry (incrementing an existing entry's quantity where applicable). A deck MUST NOT
  track "this engine" as a single reference — once added this way, a deck's contents are always
  plain cards, never engine references, so later changes to the engine do not affect decks it was
  already dropped into.
- **FR-011**: An engine's composition MUST be changed only by dragging cards into it and dragging
  its cards onto a visible "remove" control (a bin) to take them out — there is no bulk,
  checkbox-based way to replace an engine's whole card list. A non-drag, keyboard-operable
  equivalent MUST exist for removing a card this way, consistent with every other drag action in
  this app already requiring one.
- **FR-012**: An engine's Edit control MUST be limited to renaming it; it MUST NOT reopen a
  bulk card-selection picker.
- **FR-013**: Removing a card from within a deck section MUST follow the same drag-to-a-bin
  pattern (with the same non-drag, keyboard-operable equivalent) as removing a card from an
  engine (FR-011), for consistency between the two kinds of bags.
- **FR-014**: Every deck MUST offer an Export action that produces the deck's full contents
  (Main Deck and Extra Deck) as standard YDK-format text, copies that text to the clipboard, and
  lets the user save it as a file — matching this app's existing export pattern (clipboard +
  downloadable file together).
- **FR-015**: Every deck MUST offer an Import action that accepts YDK-format text and creates or
  replaces that deck's Main Deck and Extra Deck contents to match it.
- **FR-016**: Importing YDK text MUST match each referenced card only against cards already in the
  user's backlog (by the database card ID stored on that backlog entry) — it MUST NOT fetch or add
  any card from the external database during import, introducing no new network call.
- **FR-017**: When Import encounters a card it cannot resolve (per FR-016's resolution), it MUST
  skip only that card, clearly list what was skipped, and still complete the rest of the import.
- **FR-018**: Creating a new engine MUST require only a name — no minimum number of cards is
  required up front. The user populates it afterward by dragging backlog cards into it (or via the
  existing non-drag equivalent), and an engine MAY hold any number of cards, including zero.

### Key Entities

- **OwnedCard (extended)**: Gains an `effect`/description text field, populated the same way as
  its existing image/type/level/ATK/DEF fields — present once looked up (whether at add-time via
  search, or via Story 1's on-demand backfill lookup), absent otherwise.
- **Deck (restructured)**: Instead of one flat list that could hold either card or engine-reference
  entries, a deck's contents are split into a Main Deck section and an Extra Deck section, each
  independently holding only plain card entries (quantity per card) — engines are never stored as
  a deck entry; dropping one onto a deck immediately expands it into the plain card entries it
  contained at that moment (FR-010).
- **Engine (simplified)**: A named bag of plain card entries with no minimum size (including
  zero), populated only by dragging cards in and removing them via the same drag-to-a-bin pattern
  used by decks; no longer has a bulk, checkbox-based composition editor.
- **YDK Export/Import Text**: A standard, plain-text Yu-Gi-Oh deck file format (`#main`, `#extra`
  sections listing each card's database ID, one per line, once per copy owned) — not a new stored
  entity, just an export/import representation of a Deck's contents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of backlog cards — old and newly-added alike — show a real image and full
  details (type, level, ATK/DEF, effect) once successfully looked up once, with zero duplicate
  lookups for the same card within a page view.
- **SC-002**: A user can tell at a glance which engines/decks are collapsed vs expanded, and can
  toggle either state with a single click anywhere on the bag, with no separate control needed.
- **SC-003**: A user can export any deck to a valid, standard YDK file (openable by other Yu-Gi-Oh
  deck tools) and have it copied to their clipboard in the same action.
- **SC-004**: A user can import a previously-exported YDK file and get back a deck whose Main Deck
  and Extra Deck contents match what was exported, for every card already in their backlog.
- **SC-005**: Existing decks and engines continue to work (view, edit, delete, drag-to-add) with no
  loss of data after this feature ships.

## Assumptions

- "ymk" in the request is read as "YDK" — the standard, widely-used Yu-Gi-Oh deck file format
  (`#main`/`#extra` sections listing card database IDs) — since YDK is the real, well-known format
  this kind of request virtually always refers to, and no such format as "YMK" exists.
- The on-demand backlog lookup (Story 1) reuses the exact same external card database and
  debounce/cache approach already established in this app (Constitution Principle II) — it is
  triggered per-card, only when that specific card is actually viewed, never eagerly for the whole
  backlog at once (which could mean many simultaneous requests for a large backlog).
- A card's effect/description text is shown only in the full detail view (opened by a second
  click), not in the lighter hover overlay, since it is typically a full paragraph and the hover
  overlay is meant to stay compact.
- Importing YDK text replaces the target deck's entire Main/Extra contents (rather than merging
  with whatever was already there) — the standard expectation for "importing a deck file."
- A deck created before this feature (flat, unsplit contents) is treated as entirely Main Deck
  content the first time it's viewed under the new design; no card is silently discarded.
- Engines and decks keep a Delete control (and, for engines, the now-rename-only Edit control)
  available on their always-visible header, even while collapsed — only the list of cards inside
  collapses/expands; this avoids requiring an extra expand step just to delete or rename a bag.
- "Drag to a bin to remove" needs a non-drag, keyboard-operable equivalent (FR-011/FR-013),
  consistent with this app's standing rule that every drag action has one — the simplest form is
  keeping a small, focusable remove control on each card within a bag (so keyboard/touch users
  aren't limited to the drag gesture), shown alongside the bin rather than replaced by it.
- Removing a card from inside an engine or a deck section (via either the bin or its non-drag
  equivalent) does not delete anything from the backlog and does not need a confirmation modal —
  unlike removing a card from the backlog itself, which still shows the existing confirmation
  modal (Card Tag Interactions feature) since that action is destructive to owned-card data.
- The non-drag equivalents for adding a card to an engine or to a deck's Main/Extra section
  (satisfying the existing "every drag action has a non-drag equivalent" rule) remain available,
  updated only as needed to let the user choose Main vs. Extra Deck explicitly when adding to a
  deck.
