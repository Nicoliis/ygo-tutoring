# Feature Specification: Workshop, Store & Segregated Menu

**Feature Branch**: `011-workshop-and-store`

**Created**: 2026-10-17

**Status**: Draft

**Input**: User description: "Workshop section: Backlog: the Backlog element (that sees, seeks and drags) will be extracted and used in different screens. Synergy-builder: a screen that has the backlog and allows to create engines based on it. Deckbuilding: a screen that has the backlog element and the engines, to build a deck. Store section: Selling: the runs will have a balance; the API provides a value for each card; you can sell them at the 'set_price' of the set you pull them from. Buying: you can buy boosters from dates already pulled using the balance; the booster starts at a 'normal price' but increases .5 on each re-buy (e.g. if the price is 1.00 and I want to buy 3 I pay 1.00 + 1.50 + 2.25). Menu: segregate screens so it's more immersive, like those two sections have very different logics and actions."

## Clarifications

### Session 2026-10-17

- Q: Where does a booster's normal price come from? → A: One fixed starting price for every booster (1.00, the value used in the example); escalation then applies per booster.
- Q: What does a run start with, and does the escalation reset? → A: The balance starts at 0.00 (money comes from selling cards) and a booster's price never resets: it only rises with each purchase.
- Q: What happens to cards with no recorded set price? → A: They show "no sale value" and cannot be sold; nothing is credited.
- Q (changed 2026-10-17): What happens to cards with no recorded price? → A: Every copy can be sold. A card sells for its set price; when that is missing or 0 it uses the card's Cardmarket price, and 0.01 when there is no price at all. Copies saved before printings existed sell for 0.01.
- Q: How is the menu segregated? → A: A main menu with four areas (Run, Workshop, Store, Tools); each area has its own sidebar and visual theme, with a persistent "back to menu" control.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One reusable Backlog panel (Priority: P1)

The Backlog panel (list the owned cards, search them, and drag them out) becomes a single, self-contained element that behaves identically wherever it appears. The user sees their cards with the same search box, the same card tiles, the same details window and the same drag behavior on every screen that includes it.

**Why this priority**: The Synergy Builder and Deckbuilding screens both depend on it; building it once avoids two diverging copies.

**Independent Test**: Open two screens that both show the Backlog; search for a card name in each and drag a card out; confirm both behave the same and show the same cards and quantities.

**Acceptance Scenarios**:

1. **Given** a profile with owned cards, **When** a screen shows the Backlog, **Then** every owned card is listed with its quantity and rarity information.
2. **Given** the Backlog, **When** the user types in its search box, **Then** the list narrows to matching cards, and clearing the box restores the full list.
3. **Given** a card in the Backlog, **When** the user drags it onto a valid target on that screen, **Then** the target receives it and the Backlog's available quantity updates immediately.
4. **Given** a card in the Backlog, **When** the user clicks it, **Then** its card details window opens.
5. **Given** a change made on one screen (cards added, quantities changed), **When** the user opens another screen with the Backlog, **Then** it already shows the up-to-date contents.

---

### User Story 2 - Synergy Builder screen (Priority: P1)

A dedicated screen shows the Backlog next to the user's engines (groups of cards that work together). The user creates, renames and deletes engines, and fills them by dragging cards from the Backlog, respecting how many copies they own.

**Why this priority**: Engines are the first building block of the Workshop and are needed by Deckbuilding.

**Independent Test**: Create an engine, drag three different backlog cards into it, reload, and confirm the engine and its cards persist and the Backlog shows reduced availability only within the rules of the screen.

**Acceptance Scenarios**:

1. **Given** the Synergy Builder, **When** the user creates an engine with a name, **Then** it appears in the engines area, empty.
2. **Given** an engine, **When** the user drags a card from the Backlog into it, **Then** the card is added, up to the number of copies owned and the per-group maximum of three.
3. **Given** an engine containing a card, **When** the user removes it, **Then** the card is taken out of the engine and stays in the Backlog.
4. **Given** an engine, **When** the user renames or deletes it (with confirmation), **Then** only that engine is affected.
5. **Given** the user reloads the page or returns later, **When** the screen opens, **Then** all engines and their cards are as left.

---

### User Story 3 - Deckbuilding screen (Priority: P1)

A dedicated screen shows the Backlog and the engines together so the user can build decks from either source: drag single cards from the Backlog, or add a whole engine to a deck in one action. Decks keep their main and extra sections.

**Why this priority**: Deckbuilding is the purpose of the run; it must be reachable from the Workshop and use engines.

**Independent Test**: Create a deck, add one engine in one action and two loose cards from the Backlog, and confirm the deck's contents and counts are correct and persist.

**Acceptance Scenarios**:

1. **Given** the Deckbuilding screen, **When** the user creates a deck, **Then** it appears with empty main and extra sections.
2. **Given** a deck, **When** the user drags a card from the Backlog into it, **Then** the card is added to the proper section, respecting owned copies and the maximum of three per section.
3. **Given** a deck and an engine, **When** the user adds the engine to the deck, **Then** all of its cards are added together, skipping any card that would exceed the limits and telling the user which were skipped.
4. **Given** a deck, **When** the user removes cards, moves them between sections, or deletes the deck (with confirmation), **Then** the deck updates accordingly.
5. **Given** decks built before this feature, **When** the screen opens, **Then** they are present and unchanged.

---

### User Story 4 - Run balance and selling cards (Priority: P2)

Each run has a balance (money). In the Store's selling area the user can sell cards they own; each card sells for the price the card data lists for the set it was pulled from (its set price). Selling removes one copy and adds that amount to the balance.

**Why this priority**: Gives cards an in-game value and a way to fund the Store's purchases.

**Independent Test**: Note the balance, sell one pulled card, and confirm its quantity drops by one and the balance rises by exactly that card's set price.

**Acceptance Scenarios**:

1. **Given** a run, **When** the user opens the Store, **Then** the current balance is always visible.
2. **Given** an owned card pulled from a known set, **When** the user sells one copy, **Then** the balance increases by that set's price for the card and the owned quantity drops by one.
3. **Given** a card whose set price is unknown, **When** it is shown in the selling area, **Then** it shows "no sale value", the sell action is disabled, and nothing is credited.
4. **Given** a card that is in an engine or deck, **When** the user tries to sell its last unallocated copy, **Then** the user is warned and must confirm, and the allocation is reduced consistently.
5. **Given** a sale, **When** the user reloads, **Then** the balance and card quantities are as left.

---

### User Story 5 - Buying boosters with a rising price (Priority: P2)

In the Store's buying area the user can buy boosters of the sets they have already reached in the run. Each booster has a normal starting price; every time the same booster is bought again the price rises by half of its current price (1.00, then 1.50, then 2.25, and so on). Buying several at once charges each successive pack at its increased price. Bought boosters are kept in the run and can be opened with the pack opener.

**Why this priority**: Closes the economy loop (sell cards, buy more packs) but depends on balance.

**Independent Test**: With a booster at normal price 1.00, buy 3 at once and confirm the balance drops by 4.75 (1.00 + 1.50 + 2.25) and the next price shown is 3.38 (3.375 rounded to cents).

**Acceptance Scenarios**:

1. **Given** a run at stage N, **When** the user opens the buying area, **Then** only boosters of sets already reached in the run are offered.
2. **Given** a booster at its current price, **When** the user buys 1, **Then** the balance decreases by that price, one pack is added to the run's unopened packs, and the booster's price rises by 50%.
3. **Given** a booster at 1.00, **When** the user buys 3, **Then** the total shown before confirming and charged is 4.75 and the new price shown is 3.38 (3.375 rounded to cents).
4. **Given** a balance too low for the requested amount, **When** the user tries to buy, **Then** the purchase is blocked, nothing is charged, and the user sees how much is missing (or can buy fewer).
5. **Given** bought boosters, **When** the user opens them, **Then** each uses the same pack-opening experience and adds its cards to the Backlog.

---

### User Story 6 - Segregated, immersive menu (Priority: P2)

The app's navigation is split into separate areas, each with its own look and its own set of screens: the Run (progression and pack opening), the Workshop (Backlog, Synergy Builder, Deckbuilding) and the Store (Sell, Buy). Entering an area changes the navigation and visual atmosphere to fit its purpose, instead of one flat list of unrelated tools.

**Why this priority**: The two new sections have very different actions; mixing them in one list would feel confusing.

**Independent Test**: From the main menu enter the Workshop, then the Store, and confirm each shows only its own screens and theme, with a clear way back.

**Acceptance Scenarios**:

1. **Given** the main menu, **When** the user picks an area, **Then** they enter it and see only that area's screens in the navigation.
2. **Given** an area, **When** the user looks at it, **Then** it has a distinct visual identity (colors, headings) from the other areas.
3. **Given** any screen, **When** the user wants to change area, **Then** a visible control takes them back to the main menu or straight to another area.
4. **Given** the active profile, **When** the user moves between areas, **Then** the profile and its data stay the same.
5. **Given** the existing tools (Booster Draft, Proxy Sheet Builder, Pack Puller), **When** the user opens the menu, **Then** each is reachable from an appropriate area or a clearly named "Tools" area, with nothing lost.

### Edge Cases

- A card that is allocated to engines or decks is sold or removed: allocations never exceed the owned quantity afterwards.
- Selling or buying is repeated rapidly: each click is applied once and the balance never goes negative or double-credits.
- Balance arithmetic with decimals: totals are rounded to two decimals consistently and never drift between display and charge.
- Buying a large quantity at once: the total is calculated for the whole quantity and shown before confirmation; a very large request that exceeds the balance is blocked cleanly.
- A profile without run rules (Sandbox) opens the Store: the screens explain there is no balance in this profile instead of failing.
- Pre-existing cards without set/rarity/price information: they appear in the Workshop normally but are flagged as having no sale value.
- Browser storage cannot save a sale or a purchase: the user is told and the transaction is not applied.
- Dragging a card onto an invalid target or dropping outside any target: nothing changes.
- Deleting an engine that is used in decks: the user is told the cards already in decks remain in the decks.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Backlog panel MUST be a single reusable element providing listing with quantities, search, card details on click, and dragging, with identical behavior on every screen that includes it.
- **FR-002**: Every screen containing the Backlog MUST show current data without a manual refresh when the user arrives.
- **FR-003**: The Synergy Builder screen MUST show the Backlog and the engines and let the user create, rename, delete (with confirmation) and fill engines by dragging cards from the Backlog.
- **FR-004**: Engines MUST respect the owned quantity of each card and the maximum of three copies per group.
- **FR-005**: The Deckbuilding screen MUST show the Backlog and the engines and let the user create, rename and delete (with confirmation) decks with main and extra sections.
- **FR-006**: The user MUST be able to add cards to a deck by dragging from the Backlog and add a whole engine to a deck in one action, with a report of any cards skipped because of limits.
- **FR-007**: Existing engines and decks saved before this feature MUST remain intact and usable on the new screens.
- **FR-008**: Each Progression Run profile MUST have a balance, shown wherever the Store is used, that persists across sessions and starts at 0.00.
- **FR-009**: The user MUST be able to sell owned cards one copy at a time; each sale MUST credit the set price of the card in the set it was pulled from and remove one owned copy.
- **FR-010**: Every owned copy MUST be sellable. The sale price is the set price; when it is missing or 0, the card's Cardmarket price; when there is none either, 0.01. Copies with no recorded printing sell for 0.01.
- **FR-010a**: The Store MUST show, for each copy, the set it was pulled from and its set code, and MUST let the user open the card's details from the Store.
- **FR-001a**: The Backlog MUST list each card once, showing its rarest rarity; opening a card MUST show how many copies of each rarity are owned. Floating card details MUST stay on screen and never cause the list to resize or scroll.
- **FR-011**: Selling a copy that is allocated to an engine or deck MUST require explicit confirmation and MUST keep allocations consistent with the owned quantity afterwards.
- **FR-012**: The user MUST be able to buy boosters only for sets already reached in the run.
- **FR-013**: Every booster MUST start at the same fixed normal price (1.00); each additional purchase of the same booster MUST cost 50% more than the previous purchase of it (price × 1.5 per re-buy), and a booster's price MUST never reset for the run.
- **FR-014**: Buying several packs at once MUST charge each pack at its successive price (e.g. 1.00 + 1.50 + 2.25) and MUST show the total before confirmation.
- **FR-015**: A purchase MUST be blocked, with nothing charged, when the balance is insufficient, and the user MUST see how much is missing.
- **FR-016**: Bought boosters MUST be stored as unopened packs of the run and MUST be openable with the existing pack-opening experience, adding their cards to the Backlog.
- **FR-017**: Money amounts MUST be calculated and displayed with two decimals consistently, and the balance MUST never become negative.
- **FR-018**: All balance, prices-paid and pack inventory changes MUST persist across sessions and be included in the app's save/export/import.
- **FR-019**: The app MUST have a main menu with four areas (Run, Workshop, Store, Tools); entering an area shows only that area's screens in its own sidebar. The Tools area holds the existing standalone tools.
- **FR-020**: Each area MUST have a distinct visual theme, and every screen MUST show a persistent "back to menu" control.
- **FR-021**: Switching areas MUST keep the same active profile and data.
- **FR-022**: Every purchase, sale, allocation change and irreversible action MUST give clear feedback (confirmation or message) and MUST apply exactly once per user action.

### Key Entities

- **Backlog**: The profile's owned cards with quantities and printing details; the shared panel presents it.
- **Engine**: A named group of cards that work together; contains cards (up to owned quantity, max three each).
- **Deck**: A named deck with main and extra sections built from cards and engines.
- **Balance**: The run's money amount, changed by sales and purchases.
- **Sale value**: The price credited for a card, taken from its set's price for that card; absent for unknown printings.
- **Booster offer**: A purchasable booster of a reached set with its normal price and its current (escalated) price.
- **Pack inventory**: Bought, unopened boosters held by the run.
- **Area**: A menu section (Run, Workshop, Store, Tools) with its screens and visual identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Backlog behaves identically on every screen that includes it: a defined set of 5 checks (list, search, details, drag, update on arrival) passes on each screen.
- **SC-002**: A user can create an engine and put 5 cards in it in under 1 minute without instructions.
- **SC-003**: A user can build a 40-card deck using the Backlog and at least one engine in under 5 minutes.
- **SC-004**: 100% of sales credit exactly the set price of the sold card's set and remove exactly one copy.
- **SC-005**: For any quantity bought, the total charged equals the sum of successive prices (1.00 base: 1 pack = 1.00, 3 packs = 4.75) with zero rounding discrepancies between the preview and the charge.
- **SC-006**: 0 purchases or sales are applied when the balance or the rules disallow them, and the user always sees the reason.
- **SC-007**: Users identify the correct area for an action (e.g. "sell a card", "build a deck") on first try in at least 90% of test sessions.
- **SC-008**: Zero loss of pre-existing cards, engines, decks or profiles after the update.

## Assumptions

- The Workshop screens reuse the existing engine and deck data; the new screens split what is today a single Collection page into focused screens, keeping the same stored data.
- "set_price" is the per-printing price the card data provides for each set a card appears in; it is recorded when the card is pulled (in addition to the price already stored), and cards with no recorded set price have no sale value.
- "Reached" boosters are the sets of stages the run has started or completed.
- The balance applies to Progression Run profiles only; the Sandbox profile has no balance or Store.
- Re-buy escalation applies per booster per run and persists for the run; "increases .5" means +50% of the previous price (1.00, 1.50, 2.25, 3.375 ...).
- The fixed normal booster price is 1.00 and the opening balance is 0.00; both may be tuned later as game balance.
- Selling is per single copy, and money values are shown in the card data provider's currency with two decimals.
- Cards pulled before this feature (for example during pack-opener testing) have no recorded price, so they sell for 0.01 each; cards pulled afterwards sell for their set price (or Cardmarket price, or 0.01).
- "Synergy Builder" is the canonical name of the engine-building screen.
- Existing standalone tools (Booster Draft, Proxy Sheet Builder, Pack Puller) stay available and are only re-homed in the menu.
- Drag and drop remains the primary interaction, with the existing click-based alternatives preserved for accessibility.
