# Feature Specification: Card Binder View

**Feature Branch**: `014-card-binder-view`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Backlog element should display the cards, and be like a binder with 2 pages of 3x3 total 18. The engines and the deck will also start displaying cards."

## Clarifications

### Session 2026-10-18

- Q: Should engines and deck sections use the same binder pages (2 pages of 3×3, turning pages), or just show all their cards as a picture grid with no paging? → A: Plain picture grid: engines and deck sections show every card at once in a wrapping grid, no page turning; only the Backlog is a paged binder.
- Q: On a narrow screen (phone width), how should the binder's two pages be shown? → A: One page at a time: only one 3×3 page (9 cards) is shown and the page turn moves one page instead of a spread.
- Q: Should the Backlog keep a way to switch back to the old text list, or is the binder the only view? → A: Binder only: the binder replaces the text list and no switch between views is offered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse the Backlog like a binder (Priority: P1)

Today the Backlog lists owned cards as text rows. The user wants to see the cards themselves, the way a collector's binder shows them: an open binder with two facing pages, each page holding a 3×3 grid of cards, so 18 cards are in view at once. The user turns the pages to see the next 18 cards, and back. Search, filter and sort keep working and decide which cards fill the binder.

**Why this priority**: It is the core of the request and the screen the user opens most; engines and decks can follow once the look is proven here.

**Independent Test**: With more than 18 cards in the Backlog, open any Workshop screen and check that two pages of 3×3 cards are shown, that the next/previous controls reach every card exactly once, and that applying a search or filter re-fills the binder from its first page.

**Acceptance Scenarios**:

1. **Given** a Backlog with 40 cards, **When** the Backlog is shown, **Then** the first 18 cards (by the current sort) appear as two side-by-side pages of 3 rows × 3 columns, 9 cards each, and the user sees which spread they are on and how many there are (for example "Pages 1–2 of 5").
2. **Given** the first spread is shown, **When** the user goes to the next spread, **Then** cards 19–36 are shown; on the last spread the remaining cards fill the pages from the start and the unused slots stay visibly empty.
3. **Given** the first spread is shown, **When** the user looks for a "previous" action, **Then** it is unavailable; likewise "next" is unavailable on the last spread.
4. **Given** the user is on the third spread, **When** they change the search text, the filter or the sort, **Then** the binder returns to its first spread and shows the cards that match.
5. **Given** a Backlog of 18 cards or fewer, **When** the Backlog is shown, **Then** no page turning is needed and the empty slots of the pages are still shown as empty.
6. **Given** a card owned more than once, **When** it is shown in the binder, **Then** it takes one slot and its owned quantity is visible on it (and editable where it was editable before).
7. **Given** an empty Backlog or a search or filter with no result, **When** the Backlog is shown, **Then** the same messages as today are shown instead of a binder of empty pages.

---

### User Story 2 - Use cards in the binder as before (Priority: P1)

Everything the user could do with a card in the text list must still be possible from its picture: open its details, see its tags and printings, drag it into an engine or a deck, change its owned quantity and remove it, where the active profile allows it. Seeing the card must not cost any ability.

**Why this priority**: Without parity the new look is a regression for the screen the user works in.

**Independent Test**: In a Sandbox profile and in a Progression Run profile, perform every action previously available on a Backlog row (details, drag to an engine or deck, quantity edit, remove) on a card in the binder and confirm the same outcome.

**Acceptance Scenarios**:

1. **Given** a card in the binder, **When** the user selects it, **Then** its details open as they do today.
2. **Given** a card in the binder, **When** the user drags it onto an engine or a deck section, **Then** it is added exactly as dragging a Backlog row does today, subject to the same owned-copy limits.
3. **Given** a Sandbox profile, **When** the binder is shown, **Then** each card offers quantity editing and removal; **Given** a Progression Run profile, **Then** it shows the quantity read-only and offers no removal, as today.
4. **Given** a card that has no picture available, **When** it is shown in the binder, **Then** a readable stand-in with the card's name takes its slot and the card stays fully usable.

---

### User Story 3 - See the cards of engines and decks (Priority: P2)

Engines and decks also start showing their cards as pictures instead of text tags. Each engine and each deck section (Main, Extra and the others) shows every card it contains, one picture per copy, in a plain wrapping grid with no page turning, so the whole deck can be scanned at once. Removing a card from, moving a card within, and adding a card to an engine or deck keep working as they do today.

**Why this priority**: It completes the request and the visual consistency, but the Backlog (P1) already delivers value alone.

**Independent Test**: Open Deckbuilding with a deck and an engine that each hold cards; confirm each card appears as a picture, that removing, dragging between sections and adding still work, and that a section with many cards shows all of them without any page turning.

**Acceptance Scenarios**:

1. **Given** an engine with cards, **When** it is shown, **Then** each copy of each card appears as a picture in a wrapping grid.
2. **Given** a deck with Main and Extra sections, **When** the deck is shown, **Then** each section shows all of its own cards as pictures.
3. **Given** a section holding more than 18 cards, **When** it is shown, **Then** all of its cards are visible by scrolling the page, with no page turning and no hidden cards.
4. **Given** a card in an engine or deck, **When** the user removes it or drags it to another section, **Then** the result is the same as today, and the grids refresh.
5. **Given** an empty engine or deck section, **When** it is shown, **Then** it still offers a place to drop cards and says it is empty.

---

### Edge Cases

- A card whose picture fails to load or has no image: a stand-in with the card name takes the slot; layout never shifts.
- The collection changes while the user is on a late spread (a card removed, sold or added): if the current spread no longer exists, the binder shows the last existing spread; no empty spread is ever shown unless the whole list is empty.
- A very long card name or many tags on a card: the slot keeps its size; the full name is always reachable (details or accessible name).
- A narrow window (phone width): the binder shows a single 3×3 page (9 cards) at a time instead of two, and next/previous move one page; the position indicator counts pages, and every card stays reachable.
- A card owned several times is a single slot in the Backlog but one picture per copy inside engines and decks, as those lists work today.
- A large collection (hundreds of cards): only the cards of the current spread are drawn and loaded, so the screen stays responsive and no pictures of other spreads are fetched.
- A deck section or engine with very many cards: the grid wraps and grows with the page; no card is ever hidden behind a page turn.
- Keyboard-only use: page turning, opening a card and the per-card actions are all reachable and operable without a pointer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Backlog MUST show its cards as pictures arranged as a binder spread: two pages side by side, each a 3-row by 3-column grid of 9 slots, 18 slots per spread.
- **FR-002**: The user MUST be able to move to the next and previous spread, and the binder MUST show the current spread position and the total number of spreads.
- **FR-003**: Every card that matches the current search, filter and sort MUST be reachable and shown exactly once across the spreads, in the current sort order, filling the left page first and then the right page.
- **FR-004**: Changing the search text, the filter or the sort MUST return the binder to its first spread; changes to the collection MUST keep the user on the nearest existing spread.
- **FR-005**: Unused slots of a page MUST be shown as empty slots so every page keeps its 3×3 shape.
- **FR-006**: Each card in the Backlog binder MUST show its picture, its name (visibly or as an accessible name) and its owned quantity.
- **FR-007**: Every action available on a Backlog row today MUST remain available on its card in the binder with unchanged results and unchanged limits: open details, drag into an engine or deck, edit the owned quantity and remove (the last two only when the active profile allows them today).
- **FR-008**: A card without a picture, or whose picture fails to load, MUST be shown as a stand-in carrying the card's name, occupying the same slot.
- **FR-009**: Engines MUST show all of their cards as pictures, one per copy, in a plain wrapping grid with no paging.
- **FR-010**: Each deck section MUST show all of its cards as pictures, one per copy, in a plain wrapping grid with no paging.
- **FR-011**: Adding, removing and moving cards in engines and decks (including by drag and drop) MUST keep working as today, and the view MUST refresh after every change.
- **FR-012**: Empty states (empty Backlog, no match for the search or filter, empty engine or deck section) MUST keep a clear message and, for engines and deck sections, a place to drop cards.
- **FR-013**: On a narrow window the binder MUST show one 3×3 page at a time (9 cards), with next/previous moving one page and the position indicator counting pages, without horizontal scrolling and without cards becoming unreadable, while still reaching every card.
- **FR-014**: Page turning and all per-card actions MUST be operable by keyboard and carry accessible names.
- **FR-015**: In the Backlog, only the pictures of the spread being shown MUST be requested; turning a page requests only what that spread needs, and pictures already loaded MUST NOT be requested again. In engines and decks, pictures MUST load as they come into view, and pictures already loaded MUST NOT be requested again.
- **FR-016**: The Backlog view MUST look and behave the same on every Workshop screen that shows it.

### Key Entities

- **Binder**: A paged display of the Backlog's cards. Attributes: the ordered list it shows, the current spread, and the number of spreads. Has two pages per spread.
- **Page**: One face of the binder holding up to 9 cards in 3 rows by 3 columns; unfilled slots are empty.
- **Spread**: Two facing pages shown together: 18 slots.
- **Card slot**: One position on a page holding a card's picture, name and the actions available to it (details, drag, quantity, removal), or empty.
- **Backlog / Engine / Deck section**: The Backlog is the only list shown as a binder; engines and deck sections show their cards in a plain picture grid.
- **Card grid**: An unpaged, wrapping arrangement of card pictures used by engines and deck sections.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With 18 or more cards in the Backlog, 18 cards are visible at once as two 3×3 pages without scrolling on a standard desktop window.
- **SC-002**: A user can reach any card of a 300-card Backlog in at most 17 page turns, and every card is seen exactly once while paging through.
- **SC-003**: 100% of the actions available on a Backlog row today (details, drag to engine or deck, quantity edit, remove) remain available and give the same results from the binder, in both profile types.
- **SC-004**: The first spread of a 500-card Backlog appears in under 1 second after the screen opens, and each page turn shows its new spread in under 0.5 seconds.
- **SC-005**: Turning to the next spread causes no request for pictures that belong to other spreads, and returning to a spread already seen causes no new picture requests.
- **SC-006**: The binder is fully usable (every card reachable, every action available) at a phone-width window, showing one page at a time, with no horizontal scrolling.
- **SC-007**: In engines and decks, every card of every section is shown as a picture with no page turning, and adding, removing and moving cards leaves the counts identical to the same operations before this feature.

## Assumptions

- "Pictures" are the card images the app already uses for card details; no new image source is introduced.
- A spread shows 18 cards at a time (two pages of 3×3); the user moves one spread at a time, not one page at a time.
- Cards fill the left page first (reading order left to right, top to bottom), then the right page, in the order set by the existing Backlog sort.
- The existing search, type filter, synergy filter and sort keep their behavior and simply decide which cards are in the binder.
- Engines and decks show their cards as a plain, unpaged picture grid (not the binder); only the Backlog is a binder.
- Engines and decks keep listing one picture per copy owned and placed, as their text tiles do today, while the Backlog keeps one slot per distinct card with its quantity.
- "Narrow" means a window too small to show two 3×3 pages with readable cards; the exact width is a design decision.
- Page position is not remembered between visits: the binder opens on its first spread.
- The binder replaces the text list; no switch between views is offered (confirmed).
- The Collection page's own search results and the Proxy Builder, Draft, Tracker and Store screens are out of scope.
