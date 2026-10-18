# Feature Specification: Engines Panel in the Card Details Window

**Feature Branch**: `016-card-detail-engines`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "The modal with the detail of the card should have a second column to handle engines like \"music playlists\" adding new ones, or adding card to the engines. This should be accessible from every modal that shows the detail of the card, don't forget to include it when seeing the detail in the pulling of the sets, so while pulling you can improve or store the interesting cards."

## Clarifications

### Session 2026-10-18

- Q: While pulling a pack, a pulled card is not in the Backlog until the pack is finished; when the user adds it to an engine during the pull, what should happen? → A: Save the card now: adding a pulled card to an engine saves that copy to the Backlog right away so the engine add is real at once; the pack's own save at the end must not save that copy a second time.
- Q: In the Booster Draft, picked cards are saved only when the draft ends; what should the engines column do in a draft pick's details? → A: The same rule as pulls: adding a picked card to an engine saves that pick to the Backlog right away (and it is not saved twice at the end); it applies only to cards the user has picked.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add or remove a card from my engines without leaving the card (Priority: P1)

When the user opens the details of a card, the window has a second column listing their engines, the way a music app lists playlists when you add a song: every engine appears with its name and how many copies of this card it already holds. The user adds a copy to an engine, or takes one out, right there, and sees the count change at once.

**Why this priority**: It is the core of the request: engine building straight from the card, with no trip to the Workshop.

**Independent Test**: Open the details of an owned card in the Backlog, add it to two engines and remove it from one, then open the Workshop's engines and check they hold exactly those copies.

**Acceptance Scenarios**:

1. **Given** an owned card and three engines, **When** the user opens the card's details, **Then** a second column lists the three engines, each showing how many copies of this card it holds (0 when none).
2. **Given** an engine holding 0 copies, **When** the user adds a copy, **Then** the count becomes 1 immediately and a confirmation is shown without closing the window.
3. **Given** an engine holding 2 copies, **When** the user removes one, **Then** the count becomes 1; **When** they remove the last, **Then** the card leaves that engine and the count shows 0.
4. **Given** an engine already holding the most copies of this card an engine may hold, **When** the user looks at its add control, **Then** it is unavailable and says why.
5. **Given** the user owns only 2 copies of the card and an engine already holds 2, **When** the user tries to add another to that engine, **Then** it is refused with the reason (no copies left), as it is in the Workshop today (each engine may hold up to the copies owned, at most 3).
6. **Given** an engine changed from the card window, **When** the user opens the Workshop's engines (or sees them behind the window), **Then** they reflect the change.

---

### User Story 2 - Create a new engine from the card (Priority: P1)

From the same column the user creates a new engine by typing a name, and the card is put into it straight away, like starting a new playlist with the current song.

**Why this priority**: Without it the user must leave the window to make a first engine, which defeats the purpose, especially for new profiles.

**Independent Test**: With no engines at all, open a card, create an engine named "Dragons" from the window, and confirm it exists in the Workshop holding one copy of the card.

**Acceptance Scenarios**:

1. **Given** the engines column, **When** the user types a name and confirms, **Then** a new engine with that name is created, holds one copy of this card and appears at the top of the list.
2. **Given** an empty or whitespace-only name, **When** the user confirms, **Then** nothing is created and the field says a name is required.
3. **Given** a name that another engine already has, **When** the user confirms, **Then** the engine is created anyway, as in the Workshop (names do not have to be unique).
4. **Given** a profile with no engines, **When** the card window opens, **Then** the column explains there are no engines yet and offers the new-engine field.

---

### User Story 3 - The engines column is in every card details window (Priority: P1)

Wherever the app opens a card's details, the engines column is available: the Backlog, engines and decks in the Workshop, the Store's sell list, the completionist binder, the cards pulled from packs in the Progression Run, the Booster Draft picks and the pack tracker. The look and the behaviour are the same everywhere.

**Why this priority**: The request explicitly asks for it everywhere, so the user never has to remember where it works.

**Independent Test**: Open the details of a card from each of those screens and confirm the engines column is present and works the same way (or states clearly why it cannot, for example when the card is not owned).

**Acceptance Scenarios**:

1. **Given** any screen that opens card details, **When** the window opens, **Then** it shows the card details on the left and the engines column on the right.
2. **Given** a screen whose window already has extra buttons or extra information (the draft pick buttons, the printing line in the completionist binder), **When** the window opens, **Then** those stay and the engines column is added next to them.
3. **Given** a card the user does not own (for example a missing card in the completionist binder or a card in the tracker's set list), **When** the window opens, **Then** the engines column is shown but its add controls are unavailable, with a note that engines hold cards from the user's collection.
4. **Given** a narrow window, **When** the details open, **Then** the engines column goes below the card details instead of beside them and nothing needs sideways scrolling.

---

### User Story 4 - Keep interesting cards while pulling a pack (Priority: P2)

While opening packs (and picking in a Booster Draft), the user clicks a pulled card to see its details and can place it into an engine on the spot, or create a new engine for it, so the interesting cards are stored as they come out. Placing a pulled card into an engine saves that copy to the Backlog right then, so the engine addition is real immediately; when the pack is finished, that copy is not saved a second time.

**Why this priority**: It is the motivating use ("while pulling you can improve or store the interesting cards"), but it depends on the base panel from Stories 1–3.

**Independent Test**: Open a pack, click a pulled card, add it to an engine, check the Workshop shows the card in the Backlog and in that engine, finish the pack, and check the card was counted once and the rest of the pack was saved normally.

**Acceptance Scenarios**:

1. **Given** a pulled card, **When** the user opens its details during the pull, **Then** the engines column is available and shows the user's engines.
2. **Given** a pulled card not yet in the Backlog, **When** the user adds it to an engine, **Then** that copy is saved to the Backlog (with its set and rarity) and placed in the engine at once, and the column shows the new count.
3. **Given** that copy was saved early, **When** the pack is finished and its cards are saved, **Then** the copy is not saved again: the Backlog count for it is exactly one copy from that pulled card.
4. **Given** the user adds two different pulled copies of the same card to engines, **When** the pack is finished, **Then** the Backlog holds exactly as many copies as were pulled (no more, no fewer).
5. **Given** the user created a new engine for a pulled card, **When** they look at the Workshop, **Then** the engine exists, holds the card, and the card is in the Backlog, even if the pack is not finished.
6. **Given** a Booster Draft pick the user has kept, **When** they add it to an engine, **Then** the same rule applies: the pick is saved to the Backlog now and not saved again when the draft ends; a card the user has not picked cannot be added to an engine.
7. **Given** the pack is left unfinished and the user returns later, **When** they open the cards again, **Then** the cards saved early are still saved, still in their engines, and are not saved again when the pack is finished.

---

### Edge Cases

- The card is owned in fewer copies than the user tries to place across engines: the add is refused with the reason, as in the Workshop.
- Another tab or screen changed engines while the window is open: the column shows the current state when the window opens, and a refused change reports why instead of failing silently.
- The user has many engines (dozens): the list scrolls inside the column and a search or filter by name finds one quickly.
- Saving fails (browser storage full or unavailable): the change is not shown as done, a clear message appears, and nothing is changed.
- Saving the pulled card to the Backlog fails when the user adds it to an engine: the add is not shown as done, the user is told, and the card is neither in the Backlog nor in the engine.
- A pulled card saved early and then the pack's own save fails or is retried: that copy is never counted twice, and the rest of the pack is saved as normal.
- The user adds the same pulled copy to two engines: only one copy is saved to the Backlog, and a second engine addition follows the usual copies-owned rule (it is refused when no copy is left).
- Deck cards: the user may open details of a card that sits in a deck; engines are a different list from decks, and nothing in this window changes decks.
- The user is in a profile type that does not use engines on screen (for example while only pulling): the engines still exist for the profile, the column works the same.
- Selling a card in the Store while it is in engines: the Store already warns and trims engine copies; this window does not change that.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every card details window MUST have a second column, the engines column, shown beside the card details (below them on a narrow window).
- **FR-002**: The engines column MUST list every engine of the active profile by name, each with the number of copies of this card it holds.
- **FR-003**: The user MUST be able to add one copy of the card to an engine, and remove one copy from an engine, from the column, with the count updating immediately and the window staying open.
- **FR-004**: Adding MUST follow the rule engines already follow: an engine holds at most as many copies of a card as the user owns, and never more than 3; when an add is not allowed its control MUST be unavailable or refused with the reason.
- **FR-005**: The user MUST be able to create a new engine from the column by entering a name; the new engine MUST hold one copy of the card and appear at the top of the list.
- **FR-006**: Engine names entered here MUST follow the same rule as in the Workshop (not empty after trimming); an empty name MUST be explained without creating anything.
- **FR-007**: When the profile has no engines the column MUST say so and offer the new-engine field.
- **FR-008**: The column MUST be present in every window that shows a card's details: Backlog, engines and decks, Store sell list, completionist binder, pack pulls (the pulled strip and the pulled list), Booster Draft picks and the pack tracker; screens with extra buttons or information MUST keep them.
- **FR-009**: For a card the user does not own, the column MUST be shown with its add controls unavailable and a note that engines hold cards from the user's collection.
- **FR-010**: During a pack pull or a Booster Draft pick, the user MUST be able to add a card they have pulled or picked to an engine, or create an engine for it; doing so MUST save that copy to the Backlog (with its set and rarity) at once so the engine addition is real immediately.
- **FR-011**: A copy saved to the Backlog this way MUST NOT be saved again when the pack's (or the draft's) cards are saved at the end, in every case (finishing normally, finishing after reopening the page, retrying after a failed save); the Backlog count MUST equal the number of copies pulled or kept.
- **FR-012**: A new engine created during a pull MUST exist at once, holding the card, and the card MUST be in the Backlog at once.
- **FR-013**: A change that cannot be saved MUST NOT be shown as done; the user MUST see a clear message and the data MUST stay as it was.
- **FR-014**: Changes made from the column MUST be visible on every screen that shows engines (the Workshop) without a manual refresh once that screen is shown.
- **FR-015**: The column MUST be operable by keyboard, with accessible names for every engine, count, add and remove control and the new-engine field, and its changes MUST be announced (for example "Added to Dragons").
- **FR-016**: With many engines the column MUST scroll inside itself, and MUST offer a way to find an engine by name.
- **FR-017**: The window MUST NOT change decks, owned quantities of other cards, the balance or the pack contents; it only works on engines and, for a pulled or picked copy, saves that copy to the Backlog (FR-010).

### Key Entities

- **Engine**: A named list of the user's cards, each with a number of copies; belongs to the active profile (already exists).
- **Engines column**: The second column of the card details window: the list of engines with this card's count in each, plus the new-engine field.
- **Engine membership**: For one card and one engine, the number of copies the engine holds (0 when absent).
- **Early-saved copy**: A pulled or picked copy that the user put into an engine before the pack or draft finished: it is already in the Backlog and marked so the final save skips it; belongs to one pull or draft.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can put an owned card into an existing engine in at most 2 actions from opening its details (open the card, then add it), without leaving the screen.
- **SC-002**: A user can create a new engine holding the current card in at most 3 actions (open the card, type a name, confirm).
- **SC-003**: 100% of the screens that open card details show the engines column (9 of 9: Backlog, engine tiles, deck tiles, Store sell, completionist binder, pull strip, pulled list, draft pick, tracker).
- **SC-004**: After adding or removing a copy, the new count is shown in under 0.5 seconds and matches what the Workshop shows for that engine in 100% of cases.
- **SC-005**: After a pack or draft that included cards saved early is finished, the Backlog count of each such card equals the number of copies pulled or kept, in 100% of cases (never duplicated, never lost).
- **SC-006**: In 100% of refused additions (limit reached, no copies left, card not owned, empty name) the user sees the reason; none fails silently.
- **SC-007**: The window is fully usable at phone width (details above, engines below, no sideways scrolling) and by keyboard alone.

## Assumptions

- Engines are the profile's existing engines (the ones the Workshop's Synergy Builder manages); this feature does not add renaming, deleting or reordering engines, and does not touch decks.
- Adding to an engine uses the same limit as the Workshop (an engine holds at most the copies owned, and at most 3), so a card the user does not own cannot be added; engines are independent of each other (the same copy may be in several engines).
- A pulled card normally becomes owned when the pack is finished; adding it to an engine during the pull saves that one copy early (clarified), and the final save skips it.
- The record of which copies were saved early is kept with the unfinished pull so it survives closing the page.
- In the Booster Draft the same rule applies to cards the user has picked; cards the user has not picked cannot be added to an engine.
- Cards that are not in the user's collection (the completionist binder's missing cards, the tracker's set lists) show the column read-only.
- The engines column shows engines of the active profile only; switching profile shows that profile's engines.
- The second column has a width that does not squeeze the card picture and details; on a narrow window it stacks below.
