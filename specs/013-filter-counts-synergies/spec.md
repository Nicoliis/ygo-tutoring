# Feature Specification: Filter Counts & Synergy Tab

**Feature Branch**: `013-filter-counts-synergies`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Can we make the filter show how many cards each category has? (Stars, Attribute, race, type of spell, type of trap). And include in the filter the synergies. In the cards sometimes you have a name like "name"; those will become its own tab, and will be "cross type", so every card that has it in its effect text or as part of its name is included in this category."

## Clarifications

### Session 2026-10-17

- Q: Should all quoted names go into one "Synergy" tab, or one tab per quoted name? → A: One "Synergy" tab listing every quoted name with its card count and a search box.
- Q: Should an effect-text mention count only when the name is quoted, or also as plain text? → A: Only quoted mentions count in effect text; the card's own name matches the name anywhere inside it.
- Change requested 2026-10-17: Fusion Monsters that are not also Effect Monsters (type does not say "effect" and the whole text is one line, the list of materials) are removed from the synergy rules: the names they quote as materials are not listed and do not tie them; their own name still can.
- Change requested 2026-10-17: Cards with no effect (Normal monsters, and Fusion Monsters that are not also Effect Monsters) are not counted as sources: they quote no synergy names. A card that quotes its own full name is not counted for it. A card is counted for a name when it quotes it, or when its own name contains it and a different card with an effect quotes it. A name is listed only when some card with an effect quotes it.
- Q: Should counts stay fixed or update as other values are picked in the window? → A: Fixed: each count covers its tab's whole set of cards regardless of other selections.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how many cards each filter value has (Priority: P1)

In the Backlog filter window, every selectable value shows the number of cards that have it: each level/rank/link rating (stars), attribute, race, Spell type and Trap type. For example "DARK (14)", "Level 4 (23)", "Quick-Play (5)". The user can tell at a glance which values are worth picking and which would give almost nothing.

**Why this priority**: It is the direct request and makes the existing filter far easier to use; it is also independent of the synergy tab.

**Independent Test**: Open the filter, open the Monster tab, and compare the number shown next to an attribute with the number of cards listed in the Backlog after selecting only that attribute.

**Acceptance Scenarios**:

1. **Given** the filter window with a tab open, **When** it is displayed, **Then** every value in the Level/Rank/Link rating/Pendulum scale, Attribute, Race, Spell type and Trap type groups shows its card count next to its name.
2. **Given** a value showing a count of N, **When** the user selects only that value in its tab and applies the filter, **Then** exactly N cards of that tab's type are listed.
3. **Given** the user's collection changes (a card is added or removed), **When** the filter window is opened again, **Then** the counts reflect the current collection.
4. **Given** a value that no card has, **When** the tab is displayed, **Then** the value is not offered (unchanged behavior: only values present are listed).
5. **Given** the tab headers, **When** the filter window is displayed, **Then** each tab also shows how many cards belong to that type.

---

### User Story 2 - Filter by synergy names across all card types (Priority: P1)

The filter window gets a new "Synergy" tab. Card effect texts often quote a card or archetype name between double quotes (for example "Blue-Eyes White Dragon" or "Elemental HERO"). The Synergy tab lists every such quoted name found in the effect texts of the user's cards, each with the number of cards tied to it. Selecting a name lists every card that mentions that name in its effect text or has it as part of its own name, whatever the card's type. A card is therefore both found through its own name (the card "Elemental HERO Avian") and through the cards that mention it.

**Why this priority**: It is the second half of the request and turns the Backlog into a tool for finding synergies, the core purpose of the workshop.

**Independent Test**: Open the Synergy tab, select one quoted name, apply, and confirm the Backlog lists exactly the cards whose name contains it or whose effect text mentions it, across Monster, Spell and Trap cards alike.

**Acceptance Scenarios**:

1. **Given** the filter window, **When** the user opens the Synergy tab, **Then** it lists every name quoted in the effect text of at least one card in the Backlog, each with its card count, and the tab is not tied to any single card type.
2. **Given** a synergy name selected, **When** the filter is applied, **Then** every card whose effect text contains that name in quotes, or whose own name contains that name, is listed, regardless of type.
3. **Given** several synergy names selected, **When** the filter is applied, **Then** a card is listed if it is tied to any of the selected names.
4. **Given** a synergy selection and ticked or selected values in type tabs, **When** the filter is applied, **Then** a card must satisfy both: the type tabs' rules and at least one selected synergy name.
5. **Given** a synergy selection and no type tab ticked, **When** the filter is applied, **Then** cards of every type are considered and only the synergy rule narrows them.
6. **Given** a name that appears in the name or text of the same card more than once, **When** the cards are counted, **Then** that card counts once for that name.
7. **Given** the synergy list, **When** the user types in the tab's search box, **Then** the list narrows to names containing the typed text.

---

### User Story 3 - Counts and synergies persist and stay visible (Priority: P2)

The synergy selection is saved with the profile exactly like the rest of the filter (restored after reloads and on every screen that shows the Backlog, cleared by the existing clear action), and the filter icon's active state also counts the synergy selection. The existing Apply / discard behavior is unchanged.

**Why this priority**: Consistency with the filter that already exists; without it the new tab would feel unfinished.

**Independent Test**: Select a synergy name, apply, reload the page and switch to another Backlog screen; confirm the same cards remain filtered and the filter icon shows it is active; clear the filter and confirm everything returns.

**Acceptance Scenarios**:

1. **Given** an applied synergy selection, **When** the page is reloaded or another Backlog screen is opened, **Then** the same synergy selection is active.
2. **Given** only a synergy selection is active, **When** the Backlog is displayed, **Then** the filter icon shows its active state.
3. **Given** a synergy selection, **When** the user closes the window without applying, **Then** it is discarded.
4. **Given** a saved synergy name that no longer appears in any card of the Backlog, **When** the filter is applied, **Then** it matches nothing but does not break the filter, and the user can still remove it.

### Edge Cases

- Cards saved without effect text: they cannot add synergy names or be found through them until their effect text is completed; this happens in the background once, as it already does for search, and the synergy list and counts update afterwards.
- Quoted text that is not a card or archetype name (for example a quoted counter or status name): it is listed like any other quoted name; the user simply ignores names that are not useful.
- A quoted name matching a card's own name ("Dark Magician" mentioned in a Dark Magician Girl effect): both cards are tied to the name.
- Matching is not case-sensitive and ignores differences in surrounding and repeated inner spaces.
- A very long list of synergy names (hundreds): the tab stays usable through its search box and scrolling, and lists names with the highest card counts first.
- Names quoted only once and tied to a single card: still listed, with count 1.
- Counts always describe the user's Backlog as it is now, not the whole game database.
- Keyboard and screen-reader users can reach the Synergy tab, search it, tick names and hear each name with its count.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every selectable value in the filter window (level, rank, link rating, Pendulum scale, attribute, race, Spell type, Trap type) MUST display the number of Backlog cards that have it.
- **FR-002**: A value's count MUST equal the number of distinct cards of that tab's type that have the value, so that selecting only that value lists exactly that many cards.
- **FR-003**: Each type tab header MUST display how many cards belong to that type.
- **FR-004**: Counts MUST reflect the Backlog at the moment the filter window is opened; the counts MUST count distinct cards, not copies owned.
- **FR-005**: The filter window MUST have a "Synergy" tab that is not tied to a card type.
- **FR-006**: The Synergy tab MUST list every name that appears between double quotes in the effect text of at least one Backlog card, each with its card count, ordered with the highest counts first.
- **FR-007**: A card MUST be counted for a synergy name when it quotes the name between double quotes in its effect text (never when the name is its own full name), or when the name is part of its own name and a different card with an effect quotes the name. Cards with no effect (Normal monsters and Fusion Monsters that are not also Effect Monsters) quote no names. Unquoted mentions in effect text do not count; matching MUST ignore letter case and surrounding or repeated inner spaces.
- **FR-008**: A card MUST be counted once per name no matter how many times the name occurs in it.
- **FR-009**: Selecting synergy names MUST restrict the Backlog to cards tied to any selected name, regardless of card type; the Synergy selection MUST combine with the type tabs by requiring both.
- **FR-010**: With no synergy name selected the Synergy tab MUST NOT restrict the Backlog.
- **FR-011**: The Synergy tab MUST offer a search box that narrows its list of names.
- **FR-012**: The synergy selection MUST follow the existing filter rules: it takes effect only on Apply, is discarded when the window closes without Apply, is saved per profile and restored after reloads and on every Backlog screen, and is removed by the existing clear action.
- **FR-013**: The filter icon's active state and the "no cards match" message MUST take the synergy selection into account; the number on the icon is the count of ticked card types plus one when any synergy name is selected.
- **FR-014**: Cards missing their effect text MUST be completed in the background, once, so synergy names and counts become complete; the filter MUST NOT block while this happens.
- **FR-015**: The new tab, its names, the search box and every count MUST be operable by keyboard and exposed to assistive technology with the count included in each value's accessible name.
- **FR-016**: The feature MUST NOT change quantities, rarity information, drag-and-drop behavior or the existing type tabs' selection rules.

### Key Entities

- **Value count**: The number of distinct Backlog cards of a given type that have one particular level, attribute, race, Spell type or Trap type.
- **Synergy name**: A text name found between double quotes in the effect text of one or more Backlog cards.
- **Synergy tie**: The relation between a card and a synergy name: the name occurs in the card's effect text or in the card's own name.
- **Synergy selection**: The set of synergy names the user has chosen, saved with the rest of the profile's filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every value shown in the filter, the displayed count equals the number of cards listed after selecting only that value, in 100% of checks.
- **SC-002**: A user can find all cards tied to a given name in under 15 seconds from clicking the filter icon.
- **SC-003**: For any synergy name, the cards listed after applying it include 100% of the Backlog cards whose name or effect text mentions it and 0 cards that do not.
- **SC-004**: Opening the filter window (with counts and synergy names) on a Backlog of 2,000 cards takes under 1 second, and applying a synergy selection updates the list in under 1 second.
- **SC-005**: Reloading the page keeps the synergy selection and the filtered list identical in 100% of checks.
- **SC-006**: In test sessions, at least 90% of users who open the filter can correctly say which attribute has the most cards without applying the filter.

## Assumptions

- "Stars" means the level, rank, link rating or Pendulum scale groups already present in the tabs.
- Counts are for distinct cards in the Backlog of the active profile, regardless of how many copies are owned, and describe each tab's whole set of cards (they do not shrink as the user selects other values).
- There is one "Synergy" tab containing every quoted name as a selectable value, rather than a separate tab for each name; the tab is cross-type, so its selection applies to cards of every type.
- Several selected names within the Synergy tab combine with OR (a card tied to any of them), consistent with how values inside a group already behave; the Synergy tab combines with the type tabs by AND.
- A synergy name is any text between straight or curly double quotes in an effect text; no card database of archetypes is consulted.
- Only quoted mentions in effect text create a tie; the card's own name is matched anywhere inside it.
- The Synergy tab sits at the end of the tab row, which must still fit on one line in the filter window.
- Existing profiles keep working: a saved filter without a synergy selection loads as one with no synergy restriction.
- The feature applies to the Backlog filter on every screen that shows the Backlog, as the existing filter does.
