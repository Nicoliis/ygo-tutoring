# Feature Specification: Duel Room

**Feature Branch**: `018-duel-room`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Duel Room: let two players connect directly to each other (peer to peer, no server of ours) to have a match, using a manual exchange of connection codes. One player creates a room and gets a code to share (copy/paste; QR is left for later); the other pastes it and gets an answer code to send back; when the first pastes the answer the two are connected and share a duel table. The room must work as a static page (HTML, JS, CSS) with no backend. The shared table at least keeps both players in sync: life points for each player, turn counter and phase, a coin/dice roll, and a shared event log. The room must say clearly when the connection cannot be made (for example a network that blocks direct connections), when the other player leaves, and allow reconnecting a match in progress. The room is a new page of the app in the Tools area."

## Clarifications

### Session 2026-10-20

- Q: Should the QR image be part of this feature, or copy/paste only for now? → A: Copy/paste only for now; a QR image is left for a later feature.
- Q: When the two pages reconnect and each saved a different table, how should it be settled? → A: The room creator's table wins: after reconnecting both pages take the creator's table, and the other player is told it happened.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a room and invite a friend (Priority: P1)

A player opens the Duel Room page and chooses to create a room. The page gives them an invitation code they can send to their friend by any chat, by copying the text (a QR image is left for a later feature). The room then waits for the friend's reply code.

**Why this priority**: Nothing else works until two players can be linked, and this is the first half of that link.

**Independent Test**: Create a room and confirm an invitation code appears that can be copied in one action, and that the room says it is waiting for the friend's reply.

**Acceptance Scenarios**:

1. **Given** the Duel Room page, **When** the player chooses "Create room", **Then** an invitation code is shown with a Copy button, and the page says it is waiting for the reply code.
2. **Given** an invitation code, **When** the player presses Copy, **Then** the whole code is on the clipboard and the page confirms it.
3. **Given** a room waiting for a reply, **When** the player wants to start over, **Then** they can discard the room and create a new one with a new code.
4. **Given** an invitation code that is not used, **When** a long time passes (for example 10 minutes), **Then** the page tells the player that the code may have expired and offers to create a new one.

---

### User Story 2 - Join a room and complete the link (Priority: P1)

The friend opens the same page, chooses "Join room" and pastes the invitation code. The page produces a reply code that the friend sends back. When the first player pastes the reply into their waiting room, the two are connected and both see the duel table.

**Why this priority**: It is the second half of the link; together with Story 1 it is the minimum that makes the room usable.

**Independent Test**: With two browsers, create a room in one, join in the other with the code, paste the reply back, and confirm both pages show the duel table and the names of both players within a few seconds.

**Acceptance Scenarios**:

1. **Given** an invitation code, **When** the second player chooses "Join room" and pastes it, **Then** a reply code is shown with a Copy button, and the page says to send it back.
2. **Given** a reply code, **When** the first player pastes it in their waiting room, **Then** both pages move to the duel table and show "Connected".
3. **Given** a pasted code that is empty, damaged or from another kind of page, **When** the player submits it, **Then** the page says the code is not valid and keeps what the player typed so it can be corrected.
4. **Given** a reply code that does not belong to this room, **When** the first player pastes it, **Then** the page says it does not match and keeps waiting.
5. **Given** both players have joined, **When** the duel table opens, **Then** each player sees their own name and the other player's name; the names can be changed and the change shows on both pages.

---

### User Story 3 - Play on a shared duel table (Priority: P1)

Once connected, both players see the same table: the life points of both players (starting at 8000), the turn counter with whose turn it is and the current phase, a coin toss and a die roll that both see with the same result, and an event log listing every change in order. Either player can change life points (add, subtract, set) and move the turn and phase forward; every change appears on both pages at once and is written in the log with who did it.

**Why this priority**: It is the reason for the room: keeping a duel's numbers in sync without a shared screen.

**Independent Test**: In a connected room, change a player's life points on one side, press next phase on the other, flip the coin and roll the die; confirm both pages always show the same values, the same coin/die result and the same log lines in the same order.

**Acceptance Scenarios**:

1. **Given** a connected room, **When** either player changes life points by an amount (for example −1500) or sets them to a value, **Then** both pages show the new life points at once and the log records who changed what, from which value to which.
2. **Given** the table, **When** a player presses "Next phase", **Then** both pages show the next phase (Draw, Standby, Main 1, Battle, Main 2, End), and after End the turn counter increases and the other player's turn starts.
3. **Given** the table, **When** either player flips the coin or rolls the die, **Then** the same result shows on both pages and appears in the log with who rolled.
4. **Given** both players change something at nearly the same time, **When** the table settles, **Then** both pages end with the same values and the same log order (no page differs from the other).
5. **Given** life points reach 0 or below, **When** the change is applied, **Then** the table shows that player at 0 and marks the duel as won by the other player in the log, without blocking further edits (so a mistake can be undone).
6. **Given** the log, **When** more entries are added than fit, **Then** the newest are visible and the older ones can be scrolled.
7. **Given** a mistaken change, **When** a player presses Undo on their last change, **Then** the change is reverted on both pages and the log records the undo.

---

### User Story 4 - Know when the link fails, drops, or comes back (Priority: P2)

If the two cannot connect (for example a network that blocks direct connections), the page says so in plain words with what to try next. If the other player leaves or the link drops during the duel, the page says so, keeps the table as it was, and lets the players reconnect the same duel with a new exchange of codes without losing life points, turn, phase and log.

**Why this priority**: Direct links fail sometimes; clear messages and a way back keep a duel from being lost, but the happy path (P1) stands alone.

**Independent Test**: Block the link (close one tab), check the other page reports the other player left and keeps the table; then reconnect with new codes and check the duel continues with the same numbers and log.

**Acceptance Scenarios**:

1. **Given** codes were exchanged but the connection cannot be made, **When** a reasonable time passes (for example 30 seconds), **Then** the page says the connection failed, explains that some networks block direct connections, and offers to try again with new codes.
2. **Given** a duel in progress, **When** the other player closes their page or loses their connection, **Then** the remaining player sees "Opponent disconnected" at once or within a few seconds, and the table stays as it was.
3. **Given** a disconnected duel, **When** either player chooses "Reconnect", **Then** they follow the same code exchange as before; when it completes, both pages show the same table, life points, turn, phase and log as before the drop.
4. **Given** the two pages disagree about the saved duel after a reconnect (for example each kept a different last state), **When** they reconnect, **Then** both pages take the table of the player who created the room, without asking, and the other player sees a notice that their table was replaced.
5. **Given** the page is closed and opened again later, **When** the player returns, **Then** the last duel table of that room is still there to reconnect to, and can also be cleared to start a new duel.

---

### User Story 5 - Find the room in the Tools area and know what it shares (Priority: P3)

The Duel Room is a page in the Tools area of the app. The page explains in short, clear terms how it works (the two players exchange two codes, the duel then runs directly between their browsers with nothing stored on a server) and what is shared (names and the table, nothing else from the player's collection).

**Why this priority**: Discoverability and trust; the feature works without it.

**Independent Test**: Open the Tools area and confirm the Duel Room is listed; open it and read the short explanation; confirm nothing from the collection appears or is sent.

**Acceptance Scenarios**:

1. **Given** the app navigation, **When** the player opens the Tools area, **Then** the Duel Room is listed among its pages and opens from there.
2. **Given** the room page, **When** it is shown, **Then** it explains in a few lines how the two-code exchange works and that no server keeps the duel.
3. **Given** a connected room, **When** the players use it, **Then** only the names and the duel table are exchanged; no part of the Backlog, engines, decks, profile or balance is sent.

---

### Edge Cases

- The two players are on the same local network or on different networks: the room works the same from their point of view, or says clearly that it cannot connect.
- A code is pasted with extra spaces, line breaks or surrounding text from a chat message: it is still accepted when the code itself is intact.
- A very long code on a small screen: it is shown in a box that wraps or scrolls and can be copied in one action.
- The same reply code is pasted twice, or an old room's code is pasted into a new room: the page says it is not valid for this room.
- Both players press Create room (nobody joins): both are waiting; one of them must switch to Join room; the page explains that one creates and the other joins.
- A third person tries to use the same invitation code: only the first reply that completes the link is accepted; the room is for exactly two players.
- The browser asks for permission or blocks something the room needs: the page explains what happened and what to do.
- The player has an unstable connection that drops for a few seconds: the page shows the link status and reconnect option instead of pretending everything is fine.
- Time on the two computers differs: nothing depends on the clocks agreeing.
- A player edits their name during the duel: the change shows on both pages and in the log.
- The page is used in a window too narrow for two columns: the table stacks vertically with nothing cut off.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Duel Room MUST be a page of the app listed in the Tools area, usable from a plain static page with no backend of this project.
- **FR-002**: A player MUST be able to create a room and obtain an invitation code that can be copied in one action.
- **FR-003**: A player MUST be able to join a room by pasting an invitation code and obtain a reply code that can be copied in one action.
- **FR-004**: The player who created the room MUST be able to complete the link by pasting the reply code; the link is established without any server of this project taking part.
- **FR-005**: The page MUST validate pasted codes, tolerate surrounding whitespace and line breaks, and say clearly when a code is not valid or does not belong to this room, without losing what the player typed.
- **FR-006**: A room MUST link exactly two players; a code MUST be accepted only by the first reply that completes the link.
- **FR-007**: After linking, both pages MUST show the same duel table: both players' names, both players' life points (each starting at 8000), the turn counter, the player whose turn it is and the current phase.
- **FR-008**: Either player MUST be able to change either player's life points (add, subtract or set) and every change MUST show on both pages at once and be written in the event log with who made it and the before and after values.
- **FR-009**: Either player MUST be able to move to the next phase; after the last phase the turn counter MUST increase and the other player's turn MUST start; both pages MUST show the same phase and turn at all times.
- **FR-010**: Either player MUST be able to flip a coin and roll a die; the result MUST be the same on both pages and be logged with who rolled.
- **FR-011**: The event log MUST list every change in the same order on both pages, show the newest entries first or keep them in view, and allow scrolling through older ones.
- **FR-012**: When two changes happen at nearly the same time, both pages MUST end with the same table and the same log order.
- **FR-013**: A player MUST be able to undo their last change; the undo MUST be applied on both pages and logged.
- **FR-014**: Reaching 0 life points MUST be marked in the log as a win for the other player without preventing further edits.
- **FR-015**: Each player MUST be able to set their display name; names MUST show on both pages and in the log.
- **FR-016**: If the connection cannot be made within a reasonable time, the page MUST say so, explain in plain words that some networks block direct connections, and offer to try again with new codes.
- **FR-017**: If the other player leaves or the link drops, the page MUST say "Opponent disconnected" and keep the table as it was.
- **FR-018**: After a drop, players MUST be able to reconnect the same duel by exchanging new codes and continue with the same life points, turn, phase and log; when the two pages hold different saved tables, both MUST take the table of the room's creator and the other player MUST be told.
- **FR-019**: The duel table of a room MUST be kept on the player's device so it survives closing and reopening the page, and the player MUST be able to clear it to start a new duel.
- **FR-020**: Only the players' names and the duel table MUST be exchanged between the two pages; nothing from the Backlog, engines, decks, profile, balance or saved runs may be sent.
- **FR-021**: The page MUST explain briefly how the two-code exchange works and that no server keeps the duel.
- **FR-022**: The page MUST be usable by keyboard with accessible names and clear status messages, and usable on a narrow screen without sideways scrolling.

### Key Entities

- **Room**: One duel link between two players: its state (waiting, connecting, connected, disconnected), the player roles (creator and joiner) and the saved duel table.
- **Invitation code / reply code**: The two pieces of text exchanged by hand to link the players; each belongs to one room attempt and is single use.
- **Player**: One of the two people in the room: display name, life points.
- **Duel table**: The shared state: both players, turn number, whose turn it is, current phase, the last coin and die results.
- **Event log**: The ordered list of everything that happened on the table: who, what, from/to values, time of the entry in order.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two players can go from opening the page to a connected duel table in under 2 minutes, using only copy and paste (or QR), when their network allows direct connections.
- **SC-002**: After linking, a change made by one player shows on the other player's page in under 1 second on the same network and under 3 seconds on different networks, in at least 95% of changes.
- **SC-003**: Across 200 consecutive changes made by both players, including simultaneous ones, the two pages show identical life points, turn, phase and log in 100% of checks.
- **SC-004**: When the link cannot be made, 100% of attempts end with a clear message and a way to retry within 30 seconds, with no frozen or blank screen.
- **SC-005**: After an opponent drop, the remaining player sees the notice within 10 seconds, and a reconnection restores the same table (life points, turn, phase, log) in 100% of tests.
- **SC-006**: Invalid, expired or foreign codes are rejected with a message in 100% of cases and never leave the page in a broken state.
- **SC-007**: A review of what travels between the two pages finds only names and duel table data, in 100% of message types.
- **SC-008**: The page is fully operable by keyboard and at phone width with no sideways scrolling.

## Assumptions

- The room is a new page in the Tools area of the app, next to Booster Draft, Proxy Sheet Builder and the Pack Puller.
- Linking two browsers directly depends on a public service that helps browsers find a path to each other, but not on any server of this project; the exact networks that block it are outside this feature's control, and for those the page tells the user plainly.
- The invitation and reply codes are text blocks that can be sent through any chat; a QR image of them is out of scope for this feature (copy and paste only).
- A duel is for exactly two players; spectators and more than two players are out of scope.
- The table covers life points, turn and phase, one coin and one die, a log and names; moving cards, hands, decks, effects and rule checking are out of scope for this feature.
- Both players are trusted: either can change either life total, which is the common table-top use, and the log makes changes visible; preventing cheating is out of scope.
- The duel table is saved only in each player's own browser; no account or profile is needed, and the page works for any profile type.
- The app's current rule of exchanging data only with the card database will be amended to allow this peer-to-peer link between the two players, since it is the feature's purpose; no other transmission is introduced.
- Starting life points are 8000 and phases are Draw, Standby, Main 1, Battle, Main 2 and End; both are fixed in this feature.
