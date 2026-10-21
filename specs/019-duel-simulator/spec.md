# Feature Specification: Duel Simulator

**Feature Branch**: `019-duel-simulator`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Duel Simulator: turn the Duel Room into a simulation for playing a full duel with cards. Each player brings one of their own decks (from the Workshop decks: main, extra and side are not needed in play except main and extra), the deck is shuffled and each player draws a starting hand of 5. The shared table (already existing: life points, turn, phase, coin, die, log) gets a playing field for both players: monster zones, spell and trap zones, field zone, pendulum zones, graveyard, banished zone, deck, extra deck and hand. Players move their own cards by hand between zones (draw, normal summon or set, special summon, change position, flip face up or down, send to graveyard, banish, return to hand or deck, shuffle the deck, search the deck, summon from the extra deck), and there is no rule enforcement: it is a manual simulator like playing on a table. The opponent never sees your hand, your deck order, or your face-down cards until you reveal them, because that private information stays on your own device and only public information is sent to the other player. Cards are shown by their images, with the card details window available on any visible card. The simulator must keep working when the connection drops (reconnect to the same duel) and give a way to restart the duel (rematch) with the same decks."

## Clarifications

### Session 2026-10-20

- Q: How should players move their cards between zones in this first version? → A: With a card menu only (choose a card, choose an action, choose a zone when needed); drag and drop is left for a later feature.
- Q: What should happen when a player moves a card into a zone that already holds a card? → A: Zones allow stacking: the new card is placed on top and the cards below it stay accessible because each lower card is drawn with a slight horizontal and vertical offset, so any card of a stack can be selected.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring a deck and start the duel (Priority: P1)

After the two players are connected in the Duel Room, each one chooses one of their own Workshop decks. The page shows each deck's name and how many cards it has in the main and extra deck. When both players have chosen, the duel starts: each deck is shuffled on its owner's device, each player draws a starting hand of 5, life points are 8000 and the turn begins. A player's deck contents are never shown to the opponent.

**Why this priority**: Nothing can be played until the cards are on the table.

**Independent Test**: With two linked browsers, pick a deck on each side, and confirm each player sees their own 5-card hand, both see the opponent's hand as 5 hidden cards, and the deck and extra deck counts are right.

**Acceptance Scenarios**:

1. **Given** a connected room, **When** the deck choice screen opens, **Then** each player sees their Workshop decks with the number of main and extra cards, and can pick one.
2. **Given** a player's picked deck, **When** it has no cards in its main deck, **Then** the page says it cannot be used and asks for another deck.
3. **Given** a player has chosen, **When** the other has not yet, **Then** the page shows who is still choosing and lets the first player change their pick until both are ready.
4. **Given** both players have chosen, **When** the duel starts, **Then** each deck is shuffled, each player draws 5 cards, life points show 8000 each, and the table (turn, phase, log) shows the first turn.
5. **Given** a deck with fewer than 5 main deck cards, **When** the duel starts, **Then** the player draws all of them and the log says so.
6. **Given** the choice screen, **When** a player has no decks at all, **Then** it explains how to build one in the Workshop and offers to play without a deck (only life points, turn and phase, as before).

---

### User Story 2 - See both fields and my own hand (Priority: P1)

The duel table shows a playing field for each player (the opponent's field upside down at the top, yours at the bottom): five monster zones, five spell and trap zones, a field zone, two pendulum zones, a graveyard, a banished zone, the deck (with its card count), the extra deck (with its count) and, for the player themselves, their hand. Cards are shown by their images. The opponent's hand is shown only as card backs with their count.

**Why this priority**: It is the playing surface; without it there is no simulation.

**Independent Test**: In a started duel, check that every zone of both players is visible, that your hand shows images and the opponent's hand shows only backs, and that the deck counts match the decks chosen.

**Acceptance Scenarios**:

1. **Given** a started duel, **When** the table is shown, **Then** both players' zones are visible in the same layout (yours at the bottom, the opponent's at the top), with counts for deck, extra deck, graveyard and banished.
2. **Given** your hand, **When** it is shown, **Then** each card appears as its image in a row you can scroll or wrap, with the card name readable on hover or focus.
3. **Given** the opponent's hand, **When** it is shown, **Then** it appears as that many card backs and nothing else.
4. **Given** a card lying in a zone, **When** it is face-up, **Then** both players see its image; **When** it is face-down, **Then** the opponent sees only a card back and the owner sees a marker that it is face-down together with what it is.
5. **Given** a monster in attack or defense position, **When** it is shown, **Then** the position is visible to both players (a defense-position card is shown turned sideways).
6. **Given** the graveyard or the banished zone, **When** either player opens it, **Then** they see the list of cards in it (these zones are public) and can open any card's details.
7. **Given** a narrow window, **When** the table is shown, **Then** the fields and the hand remain usable without sideways scrolling.

---

### User Story 3 - Move my cards by hand (Priority: P1)

A player moves only their own cards, one at a time, choosing a card and then an action. The actions are: draw the top card, normal summon, set (face-down), special summon (including from the extra deck), change battle position, flip face-up or face-down, send to the graveyard, banish (face-up or face-down), return to the hand, return to the top or bottom of the deck, shuffle the deck, and search the deck (look through it, take a card to the hand, and the deck is shuffled afterwards). Every move shows on both pages at once, in a way that the opponent can follow, and is written in the log. There is no rule checking: any move is allowed.

**Why this priority**: It is how the duel is actually played.

**Independent Test**: Make each of the actions with a card and check that it takes effect on both pages, that the log says what happened without revealing private information, and that nothing is blocked by rules.

**Acceptance Scenarios**:

1. **Given** a card in your hand, **When** you choose Normal Summon and a free monster zone, **Then** the card appears face-up in attack position in that zone for both players and the log records it.
2. **Given** a card in your hand, **When** you choose Set, **Then** it appears face-down in the zone; the opponent sees a card back and the log says "a card was set" without its name.
3. **Given** a face-down card in a zone, **When** you flip it face-up, **Then** both players now see it and the log names it.
4. **Given** a monster in a zone, **When** you change its position, **Then** both pages show the new position.
5. **Given** a card on the field, **When** you send it to the graveyard, banish it, or return it to the hand or the deck, **Then** it moves to that place on both pages; a card returned to the hand disappears from the opponent's view of the field and the opponent's count of your hand goes up.
6. **Given** your deck, **When** you press Draw, **Then** the top card goes to your hand, the opponent sees your hand count and deck count change, and the log says "drew a card".
7. **Given** your deck, **When** you search it, **Then** you can look through every card, pick one to put in your hand, and the deck is shuffled; the opponent sees only that you searched.
8. **Given** your extra deck, **When** you special summon from it, **Then** the card goes face-up to a zone and its image is visible to both players.
9. **Given** an occupied zone, **When** you move another card there, **Then** it is not blocked: the new card is placed on top of the stack, the cards below stay in the zone and remain visible with a slight offset, and any card of the stack can be selected and moved separately.
10. **Given** an opponent's card, **When** you look at the actions available, **Then** you cannot move it (only its owner can).
11. **Given** a mistaken move, **When** you press Undo, **Then** your last move is reverted on both pages and the log records it.

---

### User Story 4 - Private information stays private (Priority: P1)

The opponent never learns what is in your hand, in your deck (or its order), or what your face-down cards are, until you reveal them. This private information lives only on your own device; the other player's device only receives public information (what is visible on the field, in the graveyard, banished face-up, counts of cards in the hand, deck and extra deck, and what you choose to reveal). You can reveal a card of your hand to the opponent on purpose.

**Why this priority**: A duel is only a game if hidden information is hidden.

**Independent Test**: Inspect what is sent to the other page during a whole duel and confirm it never contains the identity of hand cards, deck cards, deck order or face-down cards, except at the moment the owner reveals or flips them.

**Acceptance Scenarios**:

1. **Given** a card in your hand, **When** you play the duel, **Then** nothing sent to the opponent identifies it until you play it face-up or choose "Reveal to opponent".
2. **Given** a face-down card, **When** the opponent looks at the field, **Then** they see only a card back; **When** you flip it face-up, **Then** its identity is sent at that moment.
3. **Given** you reveal a hand card, **When** the opponent sees it, **Then** they see its image for as long as you keep it revealed, and the card stays in your hand; you can hide it again.
4. **Given** you search your deck, **When** you look through it, **Then** the opponent sees neither the list nor your pick unless the card is played face-up.
5. **Given** the opponent's view of your fields, **When** a card moves from the hand to the graveyard face-up, **Then** its identity is shown (it is public in the graveyard); a card moved face-down to the banished zone shows as a card back.

---

### User Story 5 - Look at any visible card (Priority: P2)

Any card the player can see (in their hand, on either field, in either graveyard, in the banished zone, in the extra deck they own) can be opened to show the card details window: image, type, attribute, level or rank, attack and defense, and effect text. Face-down opponent cards offer no details.

**Why this priority**: Reading effects is a core part of playing and an aid for both players; the duel works without it.

**Independent Test**: Select a visible card in each place and confirm its details appear; select a face-down opponent card and confirm nothing about it is shown.

**Acceptance Scenarios**:

1. **Given** a face-up card anywhere visible, **When** a player opens it, **Then** the details window shows its image, type, stats and effect.
2. **Given** a face-down card of the opponent, **When** a player opens it, **Then** only "face-down card" is shown, with no information about it.
3. **Given** the details window during a duel, **When** it opens, **Then** it does not offer to change the player's collection or engines (the duel never alters saved collections).

---

### User Story 6 - Keep playing through a drop, and play again (Priority: P2)

If the connection drops, each player's private information (hand, deck order, face-down cards) is kept on their own device, so after reconnecting the same duel continues exactly where it stopped, with no card lost, duplicated or revealed. At the end of a duel, either player can propose a rematch; when the other accepts, the same two decks are shuffled again, 5 cards are drawn, life points go back to 8000 and the duel starts over.

**Why this priority**: Connections drop and duels end; both need a clean path, but the base duel (P1) stands alone.

**Independent Test**: In a duel in progress, close one page and reopen and reconnect: the fields, the hands (hidden to the other), the deck counts and the log are as before. Then propose a rematch and check a fresh duel starts with the same decks.

**Acceptance Scenarios**:

1. **Given** a duel in progress, **When** the connection drops, **Then** each page keeps the fields and the player's own private information and shows "Opponent disconnected".
2. **Given** a dropped duel, **When** both players reconnect with new codes, **Then** the fields, both hands (still private), deck counts, graveyards, banished zones, life points, turn, phase and log are as before the drop.
3. **Given** one player closed the page and reopens it later, **When** they reconnect, **Then** their hand, deck order and face-down cards are restored from their device.
4. **Given** a player cleared their browser data and lost their private information, **When** they reconnect, **Then** the page says the private part of their duel was lost and offers a rematch.
5. **Given** a duel, **When** a player proposes a rematch and the other accepts, **Then** both decks are shuffled, each player draws 5, life points reset and the table is cleared; **When** the other declines, **Then** the duel continues unchanged.

---

### Edge Cases

- A player has fewer than 5 cards in the main deck or runs out of cards: draws take what remains and the log says the deck is empty; drawing from an empty deck is allowed and logged.
- The extra deck is empty: the extra deck zone shows 0 and cannot be opened to summon from.
- A deck card whose image is missing: a named placeholder is shown in its place.
- Both players move cards at nearly the same time: both pages end identical on everything public; each player's private information is changed only by their own moves.
- The connection drops in the middle of a move: the move is either completed on both pages or not applied on either; nothing is half done.
- A deck that has the same card several times: each copy is its own card in play (moving one does not move the others).
- A stack of many cards in one zone: the offsets stay small so the stack does not cover the neighbouring zones; the stack's count is shown and the whole stack can be listed.
- A card in the middle of a stack is moved away: the others stay in place and keep their order.
- Many cards in the graveyard or hand: lists scroll and counts stay exact.
- A player leaves for a long time: the other can wait, reconnect or rematch; no timer ends the duel.
- A player tries to move a card they do not own, or a card that is no longer where the page showed it: the move is refused with a short reason and nothing changes.
- Small phones: zones shrink or scroll but every zone stays reachable and operable.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After the link is made, each player MUST be able to choose one of their Workshop decks for the duel and see its name and its main and extra card counts; a deck with no main cards MUST be refused with a reason.
- **FR-002**: When both players have chosen, the duel MUST start: each deck is shuffled on its owner's device, each player draws 5 cards (fewer if the deck is smaller, logged), life points are 8000 and the first turn begins.
- **FR-003**: A player without any decks MUST be offered a way to continue without cards (the existing table with life points, turn, phase, coin and die), with a message about building a deck.
- **FR-004**: The table MUST show a field for each player with five monster zones, five spell and trap zones, a field zone, two pendulum zones, a graveyard, a banished zone, a deck with its count, an extra deck with its count, and (for its owner) the hand; the opponent's field MUST be shown upside down at the top and the player's own at the bottom.
- **FR-005**: Cards MUST be shown by their images (a named placeholder when an image is missing); the opponent's hand MUST be shown only as card backs and a count.
- **FR-006**: A card in a zone MUST show whether it is face-up or face-down and, for monsters, attack or defense position, to both players; face-down cards MUST appear to the opponent as card backs.
- **FR-007**: A player MUST be able to move only their own cards, with the actions: draw, normal summon, set, special summon (including from the extra deck), change position, flip face-up or face-down, send to the graveyard, banish (face-up or face-down), return to the hand, return to the top or the bottom of the deck, shuffle the deck, search the deck.
- **FR-008**: There MUST be no rule enforcement: any move of the player's own cards is allowed. A zone MAY hold several cards stacked: the newest is on top and each card below is drawn with a slight horizontal and vertical offset so every card of the stack can be seen and selected.
- **FR-009**: Every move MUST show on both pages at once and be written in the log in words that do not reveal private information (for example "a card was set", "drew a card", "searched the deck").
- **FR-010**: A player MUST be able to undo their last move, which reverts it on both pages and is logged.
- **FR-011**: The graveyard and the banished zone (face-up cards) MUST be public: either player can open them and read every card in them.
- **FR-012**: The identity of cards in a player's hand, in their deck (and its order), in their extra deck and of their face-down cards MUST stay on their own device and MUST NOT be sent to the opponent until the card becomes visible by a move (played face-up, flipped, sent face-up to a public zone) or the owner reveals it.
- **FR-013**: A player MUST be able to reveal a hand card to the opponent and hide it again; revealing does not move the card.
- **FR-014**: Any card visible to a player MUST be openable in the card details window (image, type, attribute, level or rank, attack, defense, effect); a face-down opponent card MUST offer no information; the window during a duel MUST NOT let the player change their collection or engines.
- **FR-015**: Each player's private information MUST be saved on their own device so that after a connection drop and a reconnection (or closing and reopening the page) the same duel continues with no card lost, duplicated or revealed.
- **FR-016**: If a player's private information is lost (for example browser data cleared), the page MUST say so and offer a rematch.
- **FR-017**: Either player MUST be able to propose a rematch; when the other accepts, both decks are shuffled again, each player draws 5, life points reset to 8000 and the table is cleared; when the other declines, nothing changes.
- **FR-018**: A move that cannot complete (for example because the link drops) MUST NOT be left half applied on either page.
- **FR-019**: The simulator MUST be usable by keyboard with accessible names for every zone and card, and usable on a narrow screen without sideways scrolling.
- **FR-020**: Playing a duel MUST NOT change the player's saved decks, collection or any other saved data.

### Key Entities

- **Duel deck**: The deck a player brings: its main cards (each copy a separate card in play) and its extra deck, taken from a Workshop deck.
- **Card in play**: One copy of a card with its own identity during the duel, its current place (zone), whether it is face-up or face-down, and its position.
- **Zone**: A place on a field: monster zone, spell and trap zone, field zone, pendulum zone, graveyard, banished zone, deck, extra deck, hand. A field zone (monster, spell and trap, field, pendulum) can hold a stack of cards, ordered from bottom to top.
- **Public state**: What both players see: what is face-up on the field and in the graveyard and banished zone, the counts of hand, deck and extra deck, life points, turn, phase and log.
- **Private state**: What only its owner sees: the hand, the deck and its order, the extra deck, face-down card identities.
- **Move**: One action of a player on one of their cards (for example set, flip, send to the graveyard) with its public effect and its log line.
- **Rematch**: A proposal to start the same duel again with the same decks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two linked players can start a duel (pick decks, shuffle, draw 5) in under 1 minute from the deck choice screen.
- **SC-002**: A move made by one player shows on the other page in under 1 second on the same network and under 3 seconds on different networks, in at least 95% of moves.
- **SC-003**: Across a 200-move duel with moves from both players, the public part of the two pages (field, graveyard, banished, counts, life points, turn, phase, log) is identical in 100% of checks.
- **SC-004**: A review of everything sent between the two pages in a full duel finds the identity of a hand card, deck card, deck order or face-down card only at the moment it became visible or was revealed, in 100% of messages.
- **SC-005**: After a connection drop and reconnection, the field, both hands (private), deck counts, graveyards, banished zones, life points, turn, phase and log are restored in 100% of tests with no card lost or duplicated.
- **SC-006**: Every action listed in FR-007 can be completed in at most 3 steps (choose the card, choose the action, choose the zone when one is needed).
- **SC-007**: A rematch starts a fresh duel with the same decks in under 15 seconds after the opponent accepts.
- **SC-008**: The duel is fully playable on a phone-width screen with no sideways scrolling, and every action is reachable by keyboard.

## Assumptions

- The simulator builds on the existing Duel Room link and shared table (life points, turn, phase, coin, die, log); that part is unchanged.
- Decks come from the Workshop decks of the profile in use; a deck's main and extra sections are used, the side deck is ignored; the duel never alters the saved deck or collection.
- Any card of a deck can be shown by its image and its details because the deck data already holds them; the opponent receives a card's identity only when it becomes visible.
- Both players are trusted not to cheat: the other player's page cannot verify that a draw or a shuffle was fair; preventing cheating is out of scope.
- The room creator moves first (as the existing table starts with the creator's turn); the existing coin flip is available to decide otherwise.
- Starting life points are 8000 and the starting hand is 5 cards; there is one deck choice per duel and a rematch keeps the same decks.
- Tokens, counters on cards, card equip and attachment, chains and effect resolution, and automatic game rules are out of scope; the log and the table are the only aids.
- Cards are moved with a card menu (choose a card, choose an action, choose a zone when needed); dragging cards between zones is left for a later feature (confirmed).
- The player's private state is saved only in their own browser; clearing the browser data loses it, and the page says so.
- The playing field is for exactly two players; spectators are out of scope.
