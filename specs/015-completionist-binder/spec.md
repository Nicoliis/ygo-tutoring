# Feature Specification: Completionist Binder

**Feature Branch**: `015-completionist-binder`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "Make a \"completionist\" binder. The user can choose one of the sets available to them (like when buying boosters). The binder shows every card of that set: greyed-out cards the user does not own, and full-colour cards the user owns. Include multiple rarities when a card exists in several rarities in that set, with the rarity glow and the rarity tag shown on the card."

## Clarifications

### Session 2026-10-18

- Q: Which sets can a Sandbox profile (no Progression Run) pick in the completionist binder? → A: All mainline sets; Progression Run profiles still see only the sets they reached.
- Q: Should cards with no recorded set or rarity (added by hand in Sandbox or saved before printings were recorded) colour any slot? → A: No: only copies with a recorded set and rarity colour slots; the binder notes how many owned copies could not be matched.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See a whole set and what I am missing (Priority: P1)

The user picks one of the sets available to them (the same sets they can buy boosters of) and sees a binder with every card of that set in set order, as a collector's completion binder: the cards they own appear in full colour, and the cards they do not own appear greyed out. They can tell at a glance how much of the set they have and what is missing.

**Why this priority**: It is the whole point of the request: a set-by-set completion view.

**Independent Test**: Own a few cards from one set, open the completionist binder, choose that set, and check that every card of the set has a slot, the owned ones are in colour, the rest are grey, and the progress count matches the number of coloured slots.

**Acceptance Scenarios**:

1. **Given** the user has opened the completionist binder, **When** they open the set chooser, **Then** it offers exactly the sets they can buy boosters of, most recent first, and the same set can be chosen again later.
2. **Given** a chosen set, **When** the binder is shown, **Then** it contains one slot for every card of that set in set order (by set number), laid out as the binder pages from the Backlog (two pages of 3×3 on a wide window, one page on a narrow one), with page turning.
3. **Given** a card of the set the user owns, **When** it is shown, **Then** it is in full colour; **Given** a card they do not own, **Then** it is greyed out but still recognisable.
4. **Given** a chosen set, **When** the binder is shown, **Then** a progress line states how many of the set's slots are owned out of the total and the percentage (for example "142 of 380 owned · 37%").
5. **Given** the user owns every slot of a set, **When** the binder is shown, **Then** the progress line says the set is complete.
6. **Given** a set the user has no cards from, **When** it is chosen, **Then** every slot is greyed out and the progress reads 0.

---

### User Story 2 - Every rarity of a card is its own slot, with glow and tag (Priority: P1)

A card that exists in several rarities in a set (for example a Common and a Super Rare of the same card, or an Ultra Rare and a Secret Rare) appears once per rarity. Each slot shows the rarity tag, and owned slots show the same rarity glow the app uses elsewhere, so the user sees exactly which printings they still need. Owning one rarity does not colour the others.

**Why this priority**: Without it the binder cannot say whether a set is really complete, which is what a completionist wants.

**Independent Test**: Choose a set where one card has two rarities, own only one of them, and confirm two slots exist for the card, only the owned rarity is in colour with its glow, and each shows its own rarity tag.

**Acceptance Scenarios**:

1. **Given** a card with three rarities in the set, **When** the set is shown, **Then** three slots appear for that card, next to each other in set order, each labelled with its rarity.
2. **Given** the user owns only one of those rarities, **When** the set is shown, **Then** only that slot is in colour with its glow and the other two are greyed out.
3. **Given** an owned slot, **When** it is shown, **Then** it has the same rarity glow and the same rarity tag the app uses for that rarity on other screens.
4. **Given** a greyed-out slot, **When** it is shown, **Then** its rarity tag is still visible (so the missing printing is identifiable) and it has no glow.
5. **Given** an owned slot with more than one copy, **When** it is shown, **Then** the number of copies owned (×N) is visible on it.

---

### User Story 3 - Open a card and know where I stand (Priority: P2)

The user can open the details of any slot, owned or not, to see the card (image, type, effect, printings). The binder is read-only: it never changes the collection, quantities, engines or decks, and offers no selling or buying.

**Why this priority**: Useful for deciding what to hunt next, but the binder is already valuable without it.

**Independent Test**: Click an owned and an unowned slot: the card's details open for both; nothing in the collection changes.

**Acceptance Scenarios**:

1. **Given** any slot, owned or not, **When** the user selects it, **Then** the card's details open.
2. **Given** the binder is open, **When** the user looks for edit, remove, sell or drag controls, **Then** there are none; the collection is not modified by anything done here.
3. **Given** the user owns a card and then opens or buys packs, **When** they return to the binder, **Then** the newly owned slots are in colour and the progress is up to date.

---

### Edge Cases

- A set whose card list cannot be loaded (no connection or the card database is unavailable): a clear message with a way to try again, and no partial binder pretending to be complete.
- Cards the user owns that have no recorded set and rarity (older cards saved before printings were recorded): they cannot be matched to a slot, so they do not colour any slot; the binder says some copies could not be matched.
- A copy with a recorded set but no recorded rarity: it cannot be matched to a rarity, so it colours no slot and counts among the copies that could not be matched.
- A very large set (several hundred slots): only the current pages' pictures are loaded, as in the Backlog binder.
- A set with no card pictures available for some cards: the slot shows a stand-in with the card name, greyed or coloured as usual.
- The user has no sets available yet (a new Progression Run profile that has not reached any booster): the binder explains that no sets are available yet and how to get one.
- The window becomes narrow or wide while viewing: the binder keeps its place near the same slot, as in the Backlog binder.
- Switching to another set always starts on the first page; switching back does not restore the old position.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a "completionist binder" screen in the Workshop where the user chooses one set at a time.
- **FR-002**: The sets offered MUST be exactly the sets the user can buy boosters of (reached sets in a Progression Run profile, every mainline booster set in a Sandbox profile), most recent first; choosing one MUST show that set's binder.
- **FR-003**: The binder MUST contain one slot for every card of the chosen set, one per rarity the card has in that set, in set order (by set number, then rarity).
- **FR-004**: A slot MUST be in full colour when the user owns at least one copy of that card in that set and rarity, and greyed out otherwise.
- **FR-005**: Every slot MUST show its rarity tag; owned slots MUST also show the rarity glow used for that rarity elsewhere in the app; greyed-out slots MUST NOT show the glow.
- **FR-006**: An owned slot MUST show how many copies of that printing the user owns.
- **FR-007**: The binder MUST show a progress line for the chosen set: owned slots out of total slots and the percentage, and MUST say when the set is complete.
- **FR-008**: The binder MUST use the same page layout and page turning as the Backlog binder: two pages of 3×3 (18 slots) on a wide window and one page (9 slots) on a narrow one, with position shown and every slot reachable exactly once.
- **FR-009**: Selecting any slot MUST open the card's details, whether owned or not.
- **FR-010**: The binder MUST be read-only: it MUST NOT change the collection, quantities, engines, decks, balance or packs.
- **FR-011**: The binder MUST reflect the current collection each time it is shown, including after packs are opened or cards are sold.
- **FR-012**: Copies the user owns that lack a recorded set or a recorded rarity MUST NOT colour any slot, and the binder MUST tell the user how many owned copies could not be matched (confirmed).
- **FR-013**: A set's card list MUST be requested only when that set is chosen, requested once and reused while the user stays in the app session, and never requested for sets the user does not choose.
- **FR-014**: When the set's card list cannot be loaded, the binder MUST show a clear message and a way to try again, and MUST NOT show an incomplete binder as if it were the whole set.
- **FR-015**: Only the pictures of the pages in view MUST be requested; turning a page requests only what it needs and pictures already seen are not requested again.
- **FR-016**: If no set is available, the screen MUST say so and explain how sets become available.
- **FR-017**: The screen MUST be keyboard operable, with accessible names for the set chooser, the page controls and every slot (including card name, rarity and owned or missing state), and MUST NOT rely on colour alone to say owned or missing.
- **FR-018**: The screen MUST be reachable from the Workshop navigation, in every profile type that can see the Workshop.

### Key Entities

- **Set**: One of the sets the user can buy boosters of. Has a name, a release date and a card list.
- **Set card slot**: One card in one rarity in a set: the card, its rarity and its set number (the English one when there are regional numbers). Identified by card and rarity within the set.
- **Ownership**: For a slot, the number of copies the user owns of that card in that set and rarity (0 means missing), taken from the printings recorded when cards were pulled.
- **Completion**: For a set, owned slots, total slots, percentage and whether it is complete.
- **Completionist binder**: The paged view of one set's slots, with the set chooser and the progress line; shares its paging with the Backlog binder.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After choosing a set, 100% of its cards appear (one slot per card per rarity) and the number of coloured slots equals the number of printings of that set the user owns.
- **SC-002**: The user can tell which cards of a set they are missing within 5 seconds of opening the set, from colour alone plus the progress line.
- **SC-003**: For a card with several rarities in a set, owning one rarity never colours another: 0 mismatches over a test of at least 10 multi-rarity cards.
- **SC-004**: Choosing a set shows its first pages in under 3 seconds on a normal connection, and turning a page takes under 0.5 seconds.
- **SC-005**: Opening a set the user already viewed in the same session causes no new request for its card list, and turning pages requests pictures only for the new pages.
- **SC-006**: After opening packs, returning to the binder shows the new cards in colour and the updated progress without any manual refresh.
- **SC-007**: With the card list unavailable, the user sees a message and a retry action 100% of the time, and never a partial set shown as complete.
- **SC-008**: The binder is fully usable at a phone-width window (one page at a time, no horizontal scrolling) and by keyboard alone.

## Assumptions

- The sets offered are the same list the Store uses for buying boosters: the reached sets for a Progression Run profile, and every mainline booster set for a Sandbox profile (confirmed).
- A slot is one card in one rarity within the chosen set. The regional set numbers one printing is sold under (for example LOB-001, LOB-E001 and LOB-EN001) are the same slot and the English number is shown; owning the printing under any of them colours it.
- Ownership comes from the printings recorded when cards were pulled (set and rarity per copy); that data already exists in the user's collection.
- Greyed-out slots keep their rarity tag so the user can identify the missing printing, but drop the glow.
- Slots are ordered by the number of the card in the set, then by rarity from most common to rarest.
- The binder layout and paging are those of the Backlog binder (feature 014), reused rather than redesigned.
- The binder opens on the most recent available set and on its first page; the chosen set and page are not remembered between visits.
- Filters such as "show only missing cards" and search inside the binder are not part of this request.
- The card list of a set and its pictures come from the same card database the app already uses; no new source is introduced.
- Selling, buying, quantity editing and drag-and-drop are out of scope: the binder only shows.
