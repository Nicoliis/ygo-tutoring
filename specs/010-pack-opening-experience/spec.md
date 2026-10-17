# Feature Specification: Pack Opening Experience & Pull History

**Feature Branch**: `010-pack-opening-experience`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Additional features: Remember rarity and price: card 'UR' in set 1 can be 'N' in set 2 and what set they were pulled from. The render of the cards has the 'rarity glow' and the type of rarity is named explicitly easily. Progression RUN: instead of names, show the boosters. Light grayed (not reached), clean pack (next to open), darkened pack (already opened). Booster opener: opens 1 booster (keeps the values secret and orders them by rarity). The back of a card is seen, and by clicking on it, reveals one by one. Animation is flip + go where it should. When all finish revealing, the place where the cards were is empty. On the right of this element will show a 'Next pack' if packs remain or a 'See pulled' if it was the last."

## Clarifications

### Session 2026-10-16

- Q: Where does a revealed card go after its flip? → A: Into a visible "pulled this box" strip on the page, in reveal order; "See pulled" opens the full list.
- Q: What happens to unrevealed cards if the user reloads mid-pack? → A: The same pack resumes with the same unrevealed cards still face down; already revealed cards stay pulled.
- Q: How are copies of the same card stored? → A: Grouped by printing: one entry per card + set + rarity with a quantity (price recorded at first pull of that printing).
- Q: Should the Booster Draft also use the face-down opener? → A: Yes, both flows. In the draft, each opened booster is revealed face down card by card before the pick groups are offered.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a booster pack card by card (Priority: P1)

In a Progression Run, the user opens the current stage's box one pack at a time. A pack shows its cards face down, hiding every card's identity, rarity and price. The user clicks a card to reveal it: it flips, then moves to its place in the "pulled" area. When all cards in the pack are revealed, the pack area is empty. To the right of that area a "Next pack" button appears if packs of the box remain, or a "See pulled" button if that was the last pack.

**Why this priority**: This is the core new experience and replaces the current instant "open the whole box" action.

**Independent Test**: Start a box, click each face-down card of the first pack, and confirm each flips and moves to the pulled area, the pack area ends empty, and "Next pack" appears.

**Acceptance Scenarios**:

1. **Given** a pack is opened, **When** it is displayed, **Then** all of its cards are shown face down and no card name, rarity or price is visible anywhere.
2. **Given** a face-down card, **When** the user clicks it, **Then** it flips to show the card and then moves to its place among the pulled cards.
3. **Given** the cards of a pack, **When** they are laid out, **Then** they are ordered by rarity (common first, rarest last) so the best card is revealed last.
4. **Given** every card of the pack is revealed, **When** the last one has moved, **Then** the pack area is empty and a "Next pack" button is shown to its right.
5. **Given** the last pack of the box was just fully revealed, **When** the area is empty, **Then** the button shown is "See pulled" instead of "Next pack".
6. **Given** the user clicks "See pulled", **When** the view opens, **Then** they see all cards pulled from the box with their rarity and set.

---

### User Story 2 - Remember where and how each card was pulled (Priority: P1)

Every card copy the user pulls remembers the set it came from, the rarity it had in that set, and its price at the time. The same card can therefore be an Ultra Rare from one set and a Common from another, and the user can see which copy came from where.

**Why this priority**: Rarity is a property of a specific printing, not of the card name; without this the opener and glow show wrong information.

**Independent Test**: Pull the same card from two sets where its rarity differs; confirm the collection shows two distinct entries/copies with their own set, rarity and price.

**Acceptance Scenarios**:

1. **Given** a card is pulled, **When** it is added to the backlog, **Then** its set, rarity and price are stored with that copy.
2. **Given** a card owned as Ultra Rare from set A, **When** the same card is pulled as Common from set B, **Then** both copies are kept and each shows its own rarity, set and price.
3. **Given** a card in the collection, **When** the user opens its details, **Then** they can see every owned copy's set, rarity and price.
4. **Given** cards saved before this feature (no rarity/set information), **When** they are shown, **Then** they appear without errors and indicate that rarity/set is unknown.

---

### User Story 3 - See rarity clearly on every card (Priority: P2)

Wherever a card is shown with rarity information, it has a rarity glow matching its rarity and the rarity's name is written explicitly and legibly on or next to the card (for example "Ultra Rare"), so rarity can be read at a glance without relying on color.

**Why this priority**: Makes pulls exciting and removes guesswork, but depends on stored rarity data.

**Independent Test**: Reveal cards of at least three different rarities and confirm each shows a distinct glow and a readable rarity name.

**Acceptance Scenarios**:

1. **Given** a revealed card, **When** it is shown, **Then** it has the glow for its rarity and the rarity name is clearly visible.
2. **Given** a common card, **When** it is shown, **Then** it shows its rarity name with no or minimal glow, consistent with the existing glow tiers.
3. **Given** a card with unknown rarity, **When** it is shown, **Then** it shows "Unknown rarity" and no glow.

---

### User Story 4 - Booster artwork on the Progression Run (Priority: P2)

The Progression Run page shows each stage as a booster pack picture instead of a text name. Boosters not yet reached are light grayed, the next booster to open is shown clean (full color), and boosters already opened are darkened. The set name remains available (for example as a label or tooltip) for accessibility.

**Why this priority**: Visual progression is a core game feel but does not block the opener.

**Independent Test**: With a run at stage 3, confirm stages 1–2 appear darkened, stage 3 clean, and stages 4+ light grayed.

**Acceptance Scenarios**:

1. **Given** a run in progress, **When** the page is shown, **Then** completed stages are darkened, the current stage is clean, and later stages are light grayed.
2. **Given** the current stage's box has been fully opened, **When** the page is shown, **Then** that stage appears darkened and the next stage is not yet clean until the stage is completed.
3. **Given** a booster has no available picture, **When** it is shown, **Then** a placeholder pack with the set name is used.
4. **Given** a screen reader or tooltip user, **When** they focus a booster, **Then** they hear/see its name and state (reached, next, opened).

### Edge Cases

- User leaves or reloads mid-box: already-opened packs and their cards stay in the backlog; the box resumes at the next unopened pack, and a half-revealed pack resumes with its remaining cards still face down (never regenerated, never discarded).
- User clicks very fast on several cards: each card reveals once, in a consistent state, with no duplicates in the pulled area.
- Card pulled whose rarity is missing from the data: shown as unknown rarity and sorted as least rare.
- Browser storage cannot save a pull (including when the pack's last card is revealed but its cards cannot be added to the backlog): the user sees "Couldn't save your pulls — browser storage is unavailable or full.", the pack is not counted as opened, and the user can retry.
- A booster's card data cannot be loaded: the user sees a clear message and can retry without losing progress.
- Reduced-motion preference: reveal happens without the flip/move animation but with the same end state.
- A pack with a single card or with all cards of the same rarity still follows the same flow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store, for every pulled card, the set it was pulled from, the rarity it had in that set, and its price at the first pull of that printing (kept per printing entry; later pulls of the same printing only raise its quantity).
- **FR-002**: The system MUST group owned copies by printing (card + set + rarity), each with its own quantity; copies of the same card with different sets or rarities MUST be separate entries, while a total owned quantity per card remains available.
- **FR-003**: Cards stored before this feature MUST remain usable and show unknown rarity/set without errors or data loss.
- **FR-004**: Revealed/owned cards MUST show a rarity glow matching their rarity, using the existing glow tiers.
- **FR-005**: The rarity name MUST be explicitly written and legible wherever a card with known rarity is shown in the opener, pulled view and collection, not conveyed by color alone; "legible" means the rarity name is rendered as text at least as large as the card caption text and meets the app theme contrast, verified by SC-005.
- **FR-006**: The Progression Run page MUST show each stage as a booster picture with three states: not reached (light grayed), next to open (clean), already opened (darkened).
- **FR-007**: Each booster picture MUST expose its set name and state as text (label or tooltip) for accessibility.
- **FR-008**: Opening a box MUST be done one pack at a time; each pack shows its cards face down with names, rarities and prices hidden.
- **FR-009**: Cards in a pack MUST be arranged in rarity order, rarest last.
- **FR-010**: Clicking a face-down card MUST reveal it with a flip animation followed by a movement to its place among the pulled cards.
- **FR-011**: When all cards of a pack are revealed, the pack area MUST be empty.
- **FR-012**: When a pack is fully revealed, a button to the right of the pack area MUST read "Next pack" if packs remain in the box, or "See pulled" if it was the last pack.
- **FR-013**: "See pulled" MUST show all cards pulled from the box with their rarity and set.
- **FR-014**: Each revealed card MUST be added to the profile's backlog with its pull details as it is revealed or when the pack completes, never lost on reload.
- **FR-015**: The box MUST be considered fully opened (and the stage's completion allowed) only after the last pack is fully revealed; progress within a box MUST persist across sessions.
- **FR-016**: The opener MUST respect the reduced-motion preference by skipping animations while keeping the same behavior.
- **FR-018**: In the Progression Run, a pack that is partly revealed MUST persist (the Booster Draft keeps its session in memory only and does not persist): after a reload it returns with the same cards, revealed ones kept in the pulled area and unrevealed ones still face down.
- **FR-019**: The Booster Draft MUST present each opened booster through the same face-down, click-to-reveal flow (with rarity order and hidden values) before offering its pick groups, and kept cards MUST be stored with set, rarity and price like any other pull.
- **FR-017**: Revealing MUST be operable by keyboard as well as pointer, with accessible names that do not leak hidden card information before reveal.

### Key Entities

- **Printing entry**: One owned entry per card + set + rarity with a quantity and the price recorded at first pull of that printing.
- **Card (owned)**: A card the profile owns, with total quantity and its printing entries; older cards may have no printing details.
- **Pack**: One booster within a box (or draft): ordered list of cards with which are already revealed, its position in the box.
- **Box**: The 24 packs of the current stage, with how many packs are opened and whether it is complete.
- **Stage booster picture**: The visual for a booster with its state (not reached, next, opened).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of packs, no card name, rarity or price is visible before the user reveals that card.
- **SC-002**: A user can open a full pack (reveal every card) in under 60 seconds and reach the next action without instructions.
- **SC-003**: In 100% of tested packs, cards appear in rarity order with the rarest revealed last.
- **SC-004**: For a card pulled with two different rarities from two sets, 100% of copies show the correct set, rarity and price.
- **SC-005**: Users identify a card's rarity by reading its label in under 2 seconds without relying on the glow color.
- **SC-006**: On the Progression Run page, users correctly distinguish not-reached, next and opened boosters at a glance in 95% of test viewings.
- **SC-007**: Zero loss of already-pulled cards after a reload at any point during a box.
- **SC-008**: Existing saved collections open without errors or lost cards after the update.

## Assumptions

- Terminology used throughout: "Start box" = the first, confirmed action that begins a stage's box (final); "Next pack" = open the next pack of a started box; "See pulled" = view all cards of a finished box. "Open pack" is not used as a separate action.
- The opener applies to both the Progression Run's box opening and the Booster Draft; the draft's pick-group step happens after the booster is fully revealed.
- A box remains 24 packs (from the Progression Run spec); a pack's card count follows each set's pack size.
- "Pulled area" means the spot where revealed cards of the current box accumulate, visible during the opening and summarized by "See pulled".
- "Opened" for the booster picture means the stage's box has been fully opened; the current stage with a box in progress stays clean until its box is complete.
- Rarity ordering follows the existing rarity weights/glow tiers; unknown rarity sorts as least rare.
- Booster pictures come from the card data provider when available, with a placeholder otherwise.
- Prices are stored in the provider's currency as given at pull time and are not updated later.
- Cards saved before this feature are not retroactively assigned rarity or set.
