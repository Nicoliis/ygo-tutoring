# Feature Specification: Backlog Card Tags & Type Filter

**Feature Branch**: `012-backlog-tags-and-filter`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Backlog element expansion: the card tag (for the backlog) should be 205px width. The y-scroll should be prettier. One click should directly open the modal, not the corner image of the card. Backlog filter: should have a filter icon that opens a modal. The modal should have a tab for each card type: Monster (normal/effect), Spell, Trap, Ritual, Fusion, Synchro, Xyz, Pendulum, Links. And allow to include the cards in the filter by checking a checkbox in the tab. And filtering with the values present in the tab."

## Clarifications

### Session 2026-10-17

- Q: Which values does each tab let you filter by? → A: Per-type criteria. Monster, Ritual, Fusion, Synchro, Xyz, Pendulum and Link tabs offer attribute, race and the level, rank, link rating or Pendulum scale that apply to the type; Spell and Trap tabs offer their sub-type (for example Quick-Play, Continuous). Only values present in the user's cards are listed.
- Q: Does the filter remember its settings? → A: Yes, per profile: it is saved with the active profile and restored on every screen and after reloads, and one action clears it.
- Q: How do cards without detailed data behave when a value is selected in their tab? → A: They do not match the selected value, but their missing details are completed in the background so they can match later.
- Q: How does the filter window apply changes? → A: With an Apply button: changes take effect only when Apply is pressed, and closing the window without Apply discards them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Wider backlog tags that open the details in one click (Priority: P1)

In the Backlog, each card tag is wider (205 px) so more of the card name and the rarity label are readable. Clicking a tag opens the card's details window straight away; there is no intermediate small image view of the card.

**Why this priority**: It is the everyday interaction with the Backlog and the current two-step click gets in the way.

**Independent Test**: In the Backlog, click a card tag once and confirm the details window opens immediately, and that the tag is 205 px wide with its name and rarity label readable.

**Acceptance Scenarios**:

1. **Given** a card in the Backlog, **When** the user clicks its tag once, **Then** the card details window opens at once (image, information, effect and owned rarities).
2. **Given** a card in the Backlog, **When** the user presses Enter or Space on its focused tag, **Then** the same details window opens.
3. **Given** any Backlog row, **When** it is displayed, **Then** its card tag is 205 px wide, and long names are shortened with an ellipsis instead of overflowing.
4. **Given** the Backlog on any screen that includes it, **When** the user clicks a tag, **Then** no small corner image appears before the details window.
5. **Given** the same card shown inside an engine or deck, **When** it is displayed, **Then** it keeps its existing size (this change applies to the Backlog's tags only).

---

### User Story 2 - Nicer vertical scrollbar in the Backlog (Priority: P3)

The vertical scroll of the Backlog list looks refined: slim, themed to the app's colors, visible enough to use, and consistent with the dark look of the app.

**Why this priority**: Visual polish; it does not change behavior.

**Independent Test**: Fill the Backlog with enough cards to scroll and confirm the scrollbar is slim, matches the app theme and is easy to grab.

**Acceptance Scenarios**:

1. **Given** a Backlog longer than its panel, **When** it is displayed, **Then** the scrollbar is slim and uses the app's colors rather than the browser default.
2. **Given** the scrollbar, **When** the user hovers or drags it, **Then** it gives visible feedback and remains easy to use.
3. **Given** a Backlog that fits in its panel, **When** it is displayed, **Then** no scrollbar is shown.

---

### User Story 3 - Open the filter and choose which card types to include (Priority: P1)

The Backlog has a filter icon button. Clicking it opens a filter window with one tab per card type: Monster (normal/effect), Spell, Trap, Ritual, Fusion, Synchro, Xyz, Pendulum and Link. Each tab has a checkbox that includes that card type in the filter. The Backlog then lists only cards of the included types.

**Why this priority**: Narrowing a large Backlog by card type is the main purpose of the filter.

**Independent Test**: Open the filter, tick only "Spell" and confirm the Backlog shows only Spell cards; untick it and confirm all cards return.

**Acceptance Scenarios**:

1. **Given** the Backlog, **When** the user clicks the filter icon, **Then** a window opens with nine tabs, one per card type listed above.
2. **Given** the filter window, **When** the user ticks the checkbox of one or more tabs and applies the filter, **Then** the Backlog shows only cards belonging to the ticked types.
3. **Given** no tab is ticked, **When** the filter is applied, **Then** the Backlog shows every card (no type restriction).
4. **Given** a card, **When** the filter classifies it, **Then** it belongs to exactly one tab according to its card type.
5. **Given** the filter window, **When** the user closes it without applying, **Then** the Backlog is unchanged.

---

### User Story 4 - Narrow each type with the values that exist in its tab (Priority: P2)

Inside each tab, the user can narrow the included type further using the values present in that tab, for example the attributes, races, levels or ranks that actually occur among the user's cards of that type. A card of an included type must match the tab's selected values to be listed.

**Why this priority**: Makes the type filter genuinely useful in large collections but builds on User Story 3.

**Independent Test**: In the Monster tab, tick the tab, pick one attribute and one level from the values listed, apply, and confirm only monsters with that attribute and level remain.

**Acceptance Scenarios**:

1. **Given** a tab, **When** it is opened, **Then** it lists only values that occur in the user's cards of that type (for example only the attributes the user's monsters actually have).
2. **Given** a tab with values selected, **When** the filter is applied, **Then** only cards of that type matching the selected values are listed.
3. **Given** a tab with nothing selected, **When** the filter is applied, **Then** all cards of that type are listed.
4. **Given** several tabs ticked, **When** the filter is applied, **Then** the Backlog shows the cards matching any ticked tab, each according to its own tab's values.
5. **Given** a tab with no cards of its type, **When** it is shown, **Then** it says there are no such cards instead of an empty list of options.

---

### User Story 5 - See and clear the active filter (Priority: P2)

When a filter is active the user can tell: the filter icon shows an active state with the number of types included, and a single action clears every filter and restores the full Backlog.

**Why this priority**: Prevents the "where did my cards go" confusion once the filter exists.

**Independent Test**: Apply a filter, confirm the icon shows it is active, clear it, and confirm every card is listed again.

**Acceptance Scenarios**:

1. **Given** an active filter, **When** the Backlog is displayed, **Then** the filter icon visibly shows it is active (and how many types are included).
2. **Given** an active filter, **When** the user chooses to clear it, **Then** all type and value selections reset and the full Backlog is listed.
3. **Given** the Backlog's existing name search, **When** a filter is also active, **Then** a card must match both to be listed.
4. **Given** a filter that matches no card, **When** the Backlog is displayed, **Then** it says that no cards match the filter and offers to clear it.

### Edge Cases

- Cards saved before detailed card information existed (no attribute, race or level recorded): they are still classified by type when possible and appear when their type is included and no value is selected in that tab; when a value is selected they do not match it, and their missing details are completed in the background so they can match on later filters.
- A card that is both Pendulum and another type (for example a Pendulum Fusion Monster): it belongs to the Pendulum tab only, according to the tab rule defined in the assumptions.
- A card whose type cannot be determined: it is listed only when no type is ticked, and never silently dropped from the collection.
- The Backlog is empty or the user owns no cards of a type: tabs for those types explain that there are no such cards.
- Quantities and rarity information shown on the tags stay correct while a filter is active.
- The filter applies on every screen that shows the Backlog (Backlog, Synergy Builder, Deckbuilding) and drag-and-drop from filtered lists keeps working.
- Keyboard and screen-reader users can open the filter, move between tabs, tick boxes and apply or clear the filter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Card tags inside the Backlog MUST be 205 px wide; the name takes the space it needs first and is shortened with an ellipsis when too long, while the rarity label shrinks but stays readable; tags in engines and decks MUST keep their current size.
- **FR-002**: Clicking a Backlog card tag (or pressing Enter/Space on it) MUST open the card details window directly, without an intermediate corner image view.
- **FR-003**: The Backlog list's vertical scrollbar MUST be slim and themed to the app's colors, with visible hover/drag feedback, and MUST NOT appear when the list fits.
- **FR-004**: The Backlog MUST have a filter icon button with an accessible name that opens a filter window.
- **FR-005**: The filter window MUST have one tab for each of: Monster (normal/effect), Spell, Trap, Ritual, Fusion, Synchro, Xyz, Pendulum, Link.
- **FR-006**: Each tab MUST have a checkbox that includes that card type in the filter.
- **FR-007**: Every card MUST belong to exactly one tab, decided by its card type with Pendulum taking precedence over the other monster types, then Link, Xyz, Synchro, Fusion and Ritual, and plain Monster for normal and effect monsters.
- **FR-008**: With no tab ticked the filter MUST NOT restrict by type; with one or more ticked the Backlog MUST list only cards of the ticked types.
- **FR-009**: Each tab MUST offer, as selectable values, only the values that actually occur among the user's cards of that type, using the criteria for that type: Monster, Ritual, Fusion, Synchro, Xyz, Pendulum and Link tabs offer attribute, race and level, rank, link rating or Pendulum scale where they apply; Spell and Trap tabs offer their sub-type.
- **FR-010**: A card of an included type MUST be listed only if it matches all selected values of its tab, and any value group with nothing selected MUST NOT restrict. Selecting a value in a tab MUST also tick that tab, so a selection can never be silently ignored.
- **FR-011**: The filter MUST combine with the Backlog's name search: a card must satisfy both.
- **FR-012**: Changes in the filter window MUST take effect only when the user presses Apply; closing the window without applying MUST discard them; the user MUST be able to clear all selections in one action.
- **FR-016**: The applied filter MUST be saved with the active profile and restored on every screen that shows the Backlog and after a page reload; each profile keeps its own filter.
- **FR-013**: When a filter is active the filter icon MUST show an active state with the number of included types, and an empty result MUST show a message with a way to clear the filter.
- **FR-014**: The filter MUST be available wherever the Backlog is shown and MUST NOT change quantities, rarity information or drag-and-drop behavior.
- **FR-015**: The filter window MUST be operable by keyboard (open, move between tabs, tick, apply, clear, close) and expose accessible names for tabs, checkboxes and values.

### Key Entities

- **Backlog card tag**: The compact tile for an owned card in the Backlog, 205 px wide.
- **Card type group**: One of the nine tabs; every card belongs to exactly one.
- **Type filter**: The set of ticked card type groups plus, per group, the selected values.
- **Filter value**: A value present in the user's cards of a type (such as an attribute or level) that can be selected to narrow that type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opens a card's details with a single click in 100% of attempts on the Backlog.
- **SC-002**: At least 90% of card names up to 18 characters are fully readable on a Backlog tag without truncation, and longer names are shortened with an ellipsis while the rarity label stays readable.
- **SC-003**: A user can restrict the Backlog to one card type in under 10 seconds from clicking the filter icon.
- **SC-004**: Applying any combination of tabs and values lists exactly the matching cards: 0 non-matching cards listed and 0 matching cards missing in the acceptance checks.
- **SC-005**: Clearing the filter restores the full Backlog in one action 100% of the time.
- **SC-006**: Users report the scrollbar as readable and consistent with the app theme in at least 90% of test sessions.
- **SC-007**: Filtering a Backlog of 2,000 cards updates the list in under 1 second.

## Assumptions

- The tab classification follows the card's frame type, with the precedence in FR-007, so a Pendulum Fusion Monster is shown under Pendulum.
- "Monster (normal/effect)" means monsters that are not Ritual, Fusion, Synchro, Xyz, Pendulum or Link.
- Within one tab, different value groups (for example attribute and level) combine with AND, and several values inside one group combine with OR (any of the ticked values).
- Values offered in a tab are built from the cards currently in the Backlog, so they change as the collection changes.
- Cards saved before detailed card information was stored may lack some values; they are completed in the background over time and are classified with whatever is known.
- The applied filter belongs to the active profile and is restored after reloads and on other screens; an unapplied selection in the window is not kept.
- The 205 px width and the click behavior apply to the Backlog panel only; engines and decks keep their current tags.
- The existing hover preview of a tag (key details) remains.
