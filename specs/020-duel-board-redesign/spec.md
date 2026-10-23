# Feature Specification: Duel Board and Fan Menu Redesign

**Feature Branch**: `020-duel-board-redesign`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Duel Simulator board and menu redesign. (1) A new board layout: one grid of 7 columns by 5 rows, seen from my side. Letters: lowercase = the opponent's, uppercase = mine; p/P = playable zone (any card can be put there), d/D = deck, g/G = graveyard, e/E = extra deck, b/B = banished zone, S = shared card zone (a card zone that belongs to nobody), X = no cards here. The rows, top to bottom, are: \"dpppppe\", \"gpppppp\", \"bXSXSXB\", \"PPPPPPG\", \"EPPPPPD\". So each player has 11 playable zones (no more separate monster, spell, field and pendulum zones), the two shared zones are in the middle row, and the opponent's side is the same layout turned 180 degrees. (2) A new card menu that \"fans up\": when a card is chosen, a semicircle of round buttons opens above it, and choosing a button opens a further fanned menu from that button (submenus). Menu 1 has: play, move to, signal. \"Play\" opens: face up, face down. Choosing face up or face down opens: straight (attack position), sideways (defense position). After that the player chooses any zone of their own board for the card. \"Move to\" opens: graveyard, hand, deck, extra deck. \"Move to deck\" opens: on top, on bottom, shuffle. The deck pile has its own fanned menu: draw, mill. \"Signal\" opens: activate, target, attacks. This replaces the old list menu (normal summon, set, special summon and so on). Everything else of the simulator (private information, undo, reconnect, rematch, card details) stays as it is."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A single board with 11 playable zones per player and two shared zones (Priority: P1)

The duel table shows one board of 7 columns by 5 rows, seen from the player's side. Reading it top to bottom (lowercase is the opponent's, uppercase is yours):

```
d p p p p p e
g p p p p p p
b X S X S X B
P P P P P P G
E P P P P P D
```

`p`/`P` are playable zones where any card can be put, `d`/`D` the deck, `g`/`G` the graveyard, `e`/`E` the extra deck, `b`/`B` the banished zone, `S` the two shared card zones in the middle row (they belong to nobody), and `X` cells that hold no cards. Each player has 11 playable zones; the opponent's side is the same layout turned 180 degrees. There are no longer separate monster, spell and trap, field and pendulum zones: a playable zone accepts any card.

**Why this priority**: The whole redesign hangs on the new playing surface.

**Independent Test**: Open a started duel and check that the grid has the shown shape, that each player has 11 playable zones, that the piles are where the layout puts them, and that the two shared zones are in the middle row and usable by both players.

**Acceptance Scenarios**:

1. **Given** a started duel, **When** the board is shown, **Then** it appears as a 7 by 5 grid with the cells of the layout above, the opponent's side turned 180 degrees (their deck at the top left, their extra deck at the top right, their graveyard at the left of the second row, their banished zone at the left of the middle row) and the player's own piles on the right and left of the lower rows as drawn.
2. **Given** the board, **When** a player counts zones, **Then** each player has 11 playable zones, there are 2 shared zones and the `X` cells are empty spaces that cannot hold cards and cannot be chosen.
3. **Given** a playable zone, **When** a card is put there, **Then** any card is accepted (no restriction by card type) and the zone can hold a stack as before.
4. **Given** a shared zone, **When** either player puts a card there, **Then** both players see it and either player can select it; the card remains tied to the player who put it there for hand, deck and extra deck returns.
5. **Given** the opponent's cards, **When** they are shown on their side of the board, **Then** they appear turned 180 degrees like the opponent's side, and their piles show counts as before.
6. **Given** a narrow window, **When** the board is shown, **Then** the whole grid fits without sideways scrolling, with smaller cards.

---

### User Story 2 - A fan menu that opens above a card and unfolds into submenus (Priority: P1)

Choosing one of your cards opens a semicircle of round buttons that fans up above the card. The first fan has three buttons: **Play**, **Move to** and **Signal**. Choosing one of them opens a second fan from that button; choosing a button of the second fan can open a third, and so on, until the last choice runs the action or asks for a zone. The menu replaces the old list of actions (normal summon, set, special summon...). Any button can be chosen with the mouse, touch or keyboard, and the menu closes when the player chooses elsewhere or presses Escape.

**Why this priority**: It is the new way to do everything, so no move can be made without it.

**Independent Test**: Select a card in the hand, check that the three buttons fan up above it, open each submenu and confirm that every path ends in an action or a zone choice; close the menu by clicking away and by pressing Escape.

**Acceptance Scenarios**:

1. **Given** one of your cards (in your hand, on your side of the board, in a shared zone, in a pile list), **When** you select it, **Then** a semicircle of round buttons opens above it with Play, Move to and Signal, each with a readable label.
2. **Given** the first fan, **When** you choose a button, **Then** a second fan opens from that button (fanning up from it) and the first fan stays visible with the chosen button marked.
3. **Given** an open fan, **When** you press Escape or select something outside the fan, **Then** the whole menu closes and nothing changes.
4. **Given** the fan near the top or the sides of the window, **When** it would not fit, **Then** it still stays fully on screen (it opens toward the free side) and every button remains reachable.
5. **Given** the keyboard, **When** a player moves focus into the fan, **Then** the buttons can be walked with the arrow keys or Tab, chosen with Enter or Space and closed with Escape, and each button has an accessible name.
6. **Given** a card of the opponent, **When** a player selects it, **Then** no fan opens for moving it (only its details, as before).

---

### User Story 3 - Play a card: face, orientation, then any zone of my board (Priority: P1)

**Play** opens a second fan with **Face up** and **Face down**. Choosing one opens a third fan with **Straight** (the card is upright, attack position) and **Sideways** (the card is turned sideways, defense position). After the last choice the player chooses, on their own board, any playable zone (or a shared zone) to place the card in; the zones that can receive it are highlighted. A card played face-up becomes visible to both players; a card played face-down is a card back for the opponent. The same Play path is used for a card that is already on the board, so it can be flipped or turned in place by choosing the same zone again, or moved to another zone.

**Why this priority**: Playing cards is the core action of the simulator.

**Independent Test**: Play a hand card face-up straight, face-down sideways, and re-play a card from the board into the same zone with the other face and orientation; check what the opponent sees each time.

**Acceptance Scenarios**:

1. **Given** a card in the hand, **When** you choose Play, then Face up, then Straight, then a zone, **Then** the card is placed upright and visible to both players, the hand count drops and the log says what was played.
2. **Given** a card in the hand, **When** you choose Play, Face down, Sideways and a zone, **Then** the opponent sees a card back lying sideways, you still see what it is with a face-down marker, and the log says a card was set without naming it.
3. **Given** the zone choice, **When** it is shown, **Then** all your 11 playable zones and the two shared zones are highlighted and any of them can be chosen, including a zone that already holds a card (the card is stacked on top).
4. **Given** the zone choice, **When** you press Escape or choose Cancel, **Then** nothing is played and the card stays where it was.
5. **Given** a card on the board, **When** you choose Play, a face, an orientation and the zone it is in, **Then** the card is turned or flipped in place on both pages; **When** you choose another zone, **Then** it moves there.
6. **Given** a card played face-down from the hand, **When** you later play it face-up, **Then** its identity becomes public at that moment and not before.

---

### User Story 4 - Move a card to the graveyard, hand, deck or extra deck (Priority: P1)

**Move to** opens a fan with **Graveyard**, **Hand**, **Deck** and **Extra deck**. Graveyard, Hand and Extra deck act at once. **Deck** opens one more fan with **On top**, **On bottom** and **Shuffle** (the card goes into the deck and the deck is shuffled). The extra deck choice is offered for the cards that belong there.

**Why this priority**: Without it cards cannot leave the board, so a duel cannot be played.

**Independent Test**: Move a card from the board to each destination and each deck position and check both pages; check that the deck keeps its hidden order for the opponent.

**Acceptance Scenarios**:

1. **Given** a card on the board, **When** you choose Move to, then Graveyard, **Then** it goes to your graveyard face-up and visible to both players.
2. **Given** a card on the board, **When** you choose Move to, then Hand, **Then** it returns to your hand: the opponent sees the count rise and no card on the board.
3. **Given** a card, **When** you choose Move to, Deck, On top (or On bottom), **Then** it goes to that end of your deck and the opponent sees only the deck count rise.
4. **Given** a card, **When** you choose Move to, Deck, Shuffle, **Then** it goes into the deck and the deck is shuffled; the opponent sees only the count and a log line.
5. **Given** a card that does not belong to the extra deck, **When** the Move to fan opens, **Then** Extra deck is shown as unavailable (or not shown); for a card that belongs there it moves to the extra deck.
6. **Given** a card in a shared zone that you put there, **When** it is moved to a hand, deck or extra deck, **Then** it goes to the owner's pile; **When** the other player moves it, **Then** it goes to its owner's pile and the owner is notified in the log.

---

### User Story 5 - Deck menu, and signals (Priority: P2)

Selecting the deck pile opens a fan with **Draw** and **Mill** (Mill sends the top card of the deck to the graveyard, face-up and visible). Selecting a card and choosing **Signal** opens a fan with **Activate**, **Target** and **Attacks**. A signal does not move anything: it puts a visible marker on the card (and an entry in the log) so the opponent sees that the card activates, is targeted or attacks; the marker stays for a short time and can be removed.

**Why this priority**: Useful and expected, but a duel can be played without it.

**Independent Test**: Draw and mill from the deck, then signal each of the three on a card and check the opponent sees the marker and the log line.

**Acceptance Scenarios**:

1. **Given** your deck pile, **When** you select it, **Then** a fan opens with Draw and Mill; Draw moves the top card to your hand (private), Mill sends the top card to your graveyard face-up.
2. **Given** an empty deck, **When** you choose Draw or Mill, **Then** nothing moves and the page says the deck is empty (drawing from an empty deck is logged as before).
3. **Given** a card, **When** you choose Signal then Activate, **Then** a marker "activates" appears on the card on both pages and a log line says which card (only if the card is visible) activated.
4. **Given** a card, **When** you choose Signal then Target, **Then** a "targeted" marker appears on that card; **When** you choose Signal then Attacks, **Then** an "attacks" marker appears on it, on both pages.
5. **Given** a marker on a card, **When** a short time passes or a player removes it, **Then** it disappears on both pages.
6. **Given** a face-down card, **When** it is signalled, **Then** the marker shows on its card back and the log does not name the card.

---

### User Story 6 - Everything else of the simulator keeps working (Priority: P2)

Private information, undo, reconnecting a duel, rematch, deck choice, the log and the card details window work as they do now on the new board: the opponent never sees a hand, a deck, an extra deck or a face-down card until it becomes visible; undo reverts your last move; a dropped duel continues with the same cards; a rematch starts again with the same decks. A duel saved with the old board cannot continue on the new one: the page says so and offers a rematch.

**Why this priority**: Protects what already works while the board and the menu change.

**Independent Test**: Play a short duel on the new board, drop the connection and reconnect, undo a move, open card details, propose a rematch; confirm nothing hidden was sent.

**Acceptance Scenarios**:

1. **Given** the new board, **When** any move is made, **Then** the opponent receives only public information, as before.
2. **Given** a move, **When** the player presses Undo, **Then** it is reverted on both pages (including a play, a move to a pile, a mill and a deck shuffle's placement), as before.
3. **Given** a dropped connection, **When** both players reconnect, **Then** the new board, both hands (private) and the log are restored as before.
4. **Given** a duel saved before this change, **When** the page opens it, **Then** it says that duel used the old board and cannot continue and offers a rematch with the same decks.
5. **Given** any visible card, **When** it is opened, **Then** the card details window shows as before, without the engines panel.

---

### Edge Cases

- A stack of several cards in one zone: it stays selectable card by card with the small offsets; the fan opens from the card that was chosen.
- The fan opens above a card at the top edge of the board (the opponent's side): it opens downward if there is no room above, keeping the round-button arrangement.
- A hand card near the left or right edge: the fan shifts so all buttons stay on screen.
- Two players use the shared zones at the same time: both pages end identical on everything public.
- A card is moved from a shared zone by the player who did not put it there: it returns to its owner's pile and the log says so.
- The player chooses Play but every playable zone is full of stacks: stacking is always possible, so a zone is always available.
- A very small phone: round buttons stay at least large enough to touch (not smaller than a comfortable touch target) and the fan never overlaps outside the window.
- The extra deck is empty or the card is not an extra deck card: the Extra deck choice does not appear or is unavailable with a reason.
- A signal on a card that then leaves the board: its marker goes with it.
- The old menu actions that no longer exist (normal summon, set, special summon...): their results are all reachable through Play (face and orientation) and Move to.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The duel table MUST show one board of 7 columns by 5 rows laid out, top to bottom, as `d p p p p p e`, `g p p p p p p`, `b X S X S X B`, `P P P P P P G`, `E P P P P P D`, where lowercase is the opponent's and uppercase is the player's own, with the opponent's side being the player's layout turned 180 degrees.
- **FR-002**: Each player MUST have 11 playable zones, a deck, a graveyard, an extra deck and a banished zone at the positions of FR-001; there MUST be 2 shared zones in the middle row; cells marked `X` MUST hold no cards and MUST NOT be selectable.
- **FR-003**: A playable zone MUST accept any card, with no restriction by card type, and MUST hold a stack of cards (newest on top, lower cards offset so each can be selected), as before.
- **FR-004**: A shared zone MUST be visible to both players, usable by both players to place and move cards, and keep each card tied to the player who put it there for returns to a hand, deck or extra deck.
- **FR-005**: The opponent's cards MUST be shown turned 180 degrees, with pile counts as before; the board MUST fit a narrow window without sideways scrolling.
- **FR-006**: Selecting one of the player's own cards MUST open a fan menu: a semicircle of round buttons opening above the card, with a readable label on each button.
- **FR-007**: The first fan MUST have Play, Move to and Signal; choosing a button MUST open a further fan from that button, and the chosen path MUST stay visible while the next fan is open.
- **FR-008**: Play MUST lead to Face up / Face down, then to Straight / Sideways, then to a choice of any playable zone of the player's own board or a shared zone, with the zones that can receive the card highlighted; choosing a zone MUST place the card face-up or face-down, upright (attack position) or sideways (defense position).
- **FR-009**: A face-up play MUST make the card visible to both players at that moment; a face-down play MUST show the opponent a card back and MUST NOT send the card's identity.
- **FR-010**: Play MUST also be available for a card already on the board, so it can be flipped or turned in place (choosing its own zone) or moved to another zone.
- **FR-011**: Move to MUST offer Graveyard, Hand, Deck and Extra deck; Graveyard, Hand and Extra deck MUST act at once; Deck MUST open On top, On bottom and Shuffle; Extra deck MUST be offered only for cards that belong to the extra deck.
- **FR-012**: The deck pile MUST open a fan with Draw and Mill: Draw takes the top card to the hand privately; Mill sends the top card to the graveyard face-up and visible; both MUST report an empty deck without moving anything.
- **FR-013**: Signal MUST offer Activate, Target and Attacks; a signal MUST NOT move the card, MUST show a visible marker on it on both pages (and a log line naming the card only when it is visible), and the marker MUST go away after a short time or when a player removes it.
- **FR-014**: The fan menus MUST be operable by mouse, touch and keyboard (arrow keys or Tab to move, Enter or Space to choose, Escape to close), MUST close when the player chooses elsewhere, MUST stay fully on screen (opening toward free space) and MUST have accessible names.
- **FR-015**: The old list menu (normal summon, set, special summon, change position, flip, send to graveyard, banish and so on) MUST be replaced by the fan menu; every result that menu allowed MUST remain reachable.
- **FR-016**: Cards in piles that can be opened (graveyard, banished zone, extra deck) MUST open the same fan menu when selected from their list.
- **FR-017**: Private information, undo, reconnecting, rematch, the log, deck choice and the card details window MUST work as before on the new board; a duel saved with the old board MUST be reported as unusable with an offer of a rematch.
- **FR-018**: All of this MUST remain free of rule enforcement: any move or signal of the player's own cards is allowed.

### Key Entities

- **Board grid**: The 7 by 5 arrangement of zones and piles for both players and the shared zones.
- **Playable zone**: A zone of a player's side that accepts any card and holds a stack.
- **Shared zone**: A zone in the middle row that holds a stack and is usable by both players.
- **Fan menu**: The semicircle of round buttons that opens from a card or a pile, with nested fans for submenus.
- **Placement**: The choice of face (up or down) and orientation (straight or sideways) plus the zone that a played card ends in.
- **Signal**: A temporary visible marker (activate, target, attacks) on a card, with a log line.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any card can be played face-up or face-down, straight or sideways, in any chosen zone in at most 5 selections (card, Play, face, orientation, zone).
- **SC-002**: Any card can be moved to the graveyard, hand or extra deck in at most 3 selections, and to a deck position in at most 4 selections (card, Move to, Deck, position).
- **SC-003**: 100% of the fan's buttons are reachable and operable by keyboard alone and stay fully inside the window at 360 px width and at 1280 px width.
- **SC-004**: On the new board, the opponent receives public information only: over a 300-move duel, no message names a hand, deck, extra deck or face-down card before it becomes visible, in 100% of messages (the previous privacy guarantee still holds).
- **SC-005**: After a connection drop and reconnection, the new board, both hands (private) and the log are restored in 100% of tests.
- **SC-006**: A duel saved before this change is identified as unusable and the player is offered a rematch in 100% of cases, with no error screen.
- **SC-007**: The whole board and its menus fit and work at phone width without sideways scrolling.
- **SC-008**: Every result the old list menu could produce is reachable with the new menu: 100% of the old actions have a path of the new one.

## Assumptions

- This redesign changes the board and the menu of the Duel Simulator (specs 018 and 019); decks, hands, the private/public split, undo, reconnect, rematch and card details keep their behaviour.
- The board is drawn from each player's own point of view: the player's side is always at the bottom, so the two pages show the same duel from opposite sides.
- Cards on the opponent's side are shown turned 180 degrees, as the opponent's side was before.
- Both players can use the two shared zones; a card in a shared zone belongs to whoever put it there and goes back to that player's hand, deck or extra deck.
- Flipping or turning a card already on the board is done with Play (choosing the same zone), since the new menu has no separate flip or position actions.
- Banishing is not part of the described Move to fan; the banished zones stay on the board and can be reached through the Move to fan if it is extended (decision for the next step).
- The deck's other actions of the earlier menu (search the deck, look at the top card, shuffle the deck) are not part of the described deck fan; whether they remain is a decision for the next step.
- Revealing a hand card to the opponent was part of the earlier menu; where it lives in the new menu is a decision for the next step.
- A signal is only informative (a marker and a log line); it moves nothing and checks no rule; Attacks does not choose a target in this version.
- Markers of a signal disappear by themselves after a few seconds and can also be removed by hand.
- Duels saved with the old board cannot be resumed on the new board; they are offered a rematch with the same decks.
