# Tasks: Duel Simulator

**Input**: Design documents from `/specs/019-duel-simulator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/duel-simulator-contract.md, quickstart.md

**Tests**: The pure rules (deck building, private state, board events and their inverses, privacy of messages) get automated checks in the existing contract tests, as the plan states. The pages are verified with `quickstart.md` and the real-time two-page check used for the Duel Room.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in `duel/views/` and behaviour stays outside it; **commit after each task or small group of related tasks** once its checks pass (standing request); the Duel Room keeps working at every commit (a duel without decks stays possible).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] deck and start, [US2] fields and hand, [US3] moves, [US4] private information, [US5] card details, [US6] reconnect and rematch

---

## Phase 1: Setup

- [X] T001 Add the option to hide the engines panel in the card details window: `showCardDetailWindow({ ..., engines })` in `shared/card-detail-window.js` skips mounting the panel when `engines === false` (and drops the two-column layout), and pass the option through `openCardDetailModal` in `shared/card-detail-modal.js` as a new last parameter (the Workshop version `collection/collection-card-detail-modal.js` keeps its signature); other callers are unchanged

---

## Phase 2: Foundational (pure rules; blocks all user stories)

- [X] T002 [P] Create `duel/duel-cards.js` with `STARTING_HAND = 5` at the top and: `snapshotOf(card)` (the fields the details window needs: `apiId`, `name`, `type`, `race`, `attribute`, `level`, `atk`, `def`, `desc` or `effect`, `imageSmall`, `imageFull`, link/pendulum fields when present), `buildDuelDeck(collection, deckId, side)` (reads a deck of the saved collection without changing it: every copy of each main and extra entry becomes its own instance `{ uid: "<side>-<n>", card: snapshot }`; `{ ok: false, reason }` when the deck is missing or its main deck is empty; extra entries whose card is missing are skipped) and `shuffled(list, random)` (Fisher-Yates over a copy with the injected random)
- [X] T003 [P] Create `duel/duel-board.js` with the constants at the top (`MONSTER_ZONES = 5`, `SPELL_ZONES = 5`, `FIELD_ZONES = 1`, `PENDULUM_ZONES = 2`, `ZONE_KINDS`, `PILES`) and the pure public board: `newSim()` and `applyBoardEvent(sim, event)` returning `{ sim, ok, reason, inverse }` for the events of `data-model.md` (`ready`, `start`, `draw`, `move`, `flip`, `position`, `reveal`, `hide`, `search`, `shuffle`, `rematch`, `rematch-accept`, `reset`): moves from hand, deck or extra need that count above 0 and change it; moves from a field zone or a pile need the uid to be there; moves into a field zone push onto the stack (never refused for rules); a card in a public place always carries its snapshot and a face-down card never does; each result carries the `inverse` event that restores the previous public board (including the stack index a card was taken from); counts never go below 0
- [X] T004 [P] Create `duel/duel-private.js` with the pure private state: `newPrivate(duelId, side, deck, random)` (deck shuffled, `STARTING_HAND` cards drawn to the hand, `hidden` empty), `applyPrivate(priv, event)` returning `{ priv, ok, reason }` for the owner's side of `draw`, `move` (hand/deck/extra to and from the field and piles, keeping the identities of face-down cards in `hidden`), `flip`, `search` (taking a card from the deck to the hand), `shuffle` and `undo` (restoring the snapshot stored when the move was applied), `cardAt(priv, uid)`; it never touches the public side
- [X] T005 Integrate the board into the table in `duel/duel-table.js`: `newTable` gets `sim: null` (older saved tables without `sim` keep working); `applyEvent` delegates the simulator kinds to `applyBoardEvent`, stores the new `sim`, writes a log entry whose text never reveals private data ("set a card", "drew a card", "searched the deck", "flipped X face-up" only when the card became visible) and keeps the event's `inverse` in the entry; the existing `undo` also reverts a move by applying that `inverse`, under the same rule (only the player's own last change)
- [X] T006 Add contract tests to `shared/contract-tests.js` and register `duel/duel-cards.js`, `duel/duel-board.js` and `duel/duel-private.js` in the Node list of `shared/profiles.test.js` and in `shared/tests.html` (before `duel-table.js`): deck building (copies become separate instances, empty or missing deck refused, the collection is not changed), shuffle with an injected random, the board for every action and its inverse (draw, normal summon, set, special summon from the hand and the extra deck, position, flip, graveyard, banish face-up and face-down, return to hand and to the deck top and bottom), stacks (push, offset order, removing a middle card keeps the others in order), counts and "a card is in exactly one place" invariants over a long random sequence of moves, private state following the same moves, the table integration (log text without private data, undo of a move, refusal when the last entry is not the player's own), and that an old table without `sim` still works; run `node shared/profiles.test.js` and confirm "profiles contract: OK"
- [X] T007 Add the `onApplied(event, table)` hook to `createDuelSession` in `duel/duel-session.js`, called on both devices right after an event is applied (own or the other's, by the creator's authority or the joiner's mirror), and add a test with the in-memory link that both sessions call it for every event in order

**Checkpoint**: the pure rules, the table integration and the hook pass their tests; the Duel Room still works unchanged without decks.

---

## Phase 3: User Story 1 - Bring a deck and start the duel (Priority: P1) 🎯 MVP

**Goal**: After linking, each player picks a deck and the duel starts with shuffled decks and 5 cards each.

**Independent Test**: `quickstart.md` section 2.

- [X] T008 [P] [US1] Create `duel/views/duel-deck-view.js` with `renderDeckChoice(rootEl, model, handlers)`: the player's Workshop decks with name and main/extra counts as selectable options, the chosen one marked, who is still choosing, a note when a deck cannot be used, the "continue without cards" action and the explanation of how to build a deck when there are none; DOM only
- [X] T009 [US1] Create `duel/duel-play.js` (behaviour): `PRIVATE_KEY = "ygoDuelPrivate"` at the top; read the saved collection once and list the decks; `chooseDeck(deckId)` builds the duel deck with `buildDuelDeck`, keeps it in memory, sends a `ready` event; when the creator sees both players ready it resolves `start`; on `start` (through `onApplied`) each device builds its private state with `newPrivate`, saves it under `PRIVATE_KEY`, and the table shows turn 1 with 8000 life points; changing the pick before both are ready replaces the `ready`
- [X] T010 [US1] Wire the deck choice into `duel/duel-room.js` and `duel/index.html`: after the link opens the deck choice screen is shown instead of the table until the duel starts; "continue without cards" goes straight to the existing table (`sim` stays `null`); add the new scripts and styles in order (`duel-cards.js`, `duel-board.js`, `duel-private.js` before `duel-table.js`; `duel-play.js` and the views before `duel-room.js`); keep a duel without decks working as before

**Checkpoint**: Two linked pages pick decks and start with 5 cards each (hands not yet drawn on screen until Phase 4).

---

## Phase 4: User Story 2 - See both fields and my own hand (Priority: P1)

**Goal**: The playing surface: both fields, the hand and the counts.

**Independent Test**: `quickstart.md` section 3.

- [X] T011 [P] [US2] Create `duel/views/duel-board-view.js` with `renderBoard(rootEl, model, handlers)`: for each player a field with five monster zones, five spell and trap zones, the field zone, two pendulum zones, graveyard, banished, deck and extra deck with their counts, the player's hand as a row of card images and the opponent's hand as that many backs; the opponent's field upside down at the top and the player's own at the bottom; a card is its image (named placeholder when missing), a face-down card is a back (with a face-down marker and the card's identity for its owner only), a defense-position card is turned sideways; a stack is drawn bottom to top with each lower card offset by `STACK_OFFSET_PX` right and down and every card its own selectable element; piles show counts; accessible names for zones and cards; DOM only
- [X] T012 [P] [US2] Style the board in `duel/views/duel.css`: the field grid, the upside-down opponent field, the hand row, the stack offsets (`STACK_OFFSET_PX = 6` as a CSS variable at the top), sideways defense cards, card backs, focus styles and a narrow layout that keeps every zone reachable without sideways scrolling
- [X] T013 [US2] Build the board model in `duel/duel-play.js` and draw it from `duel/duel-room.js`: the public `table.sim` plus this device's private hand and counts; open the graveyard and the banished zone of either player as a list (public cards, each openable); redraw after every applied event

**Checkpoint**: Both fields, the hand and the counts show; nothing can be moved yet.

---

## Phase 5: User Story 3 - Move my cards by hand (Priority: P1)

**Goal**: Every listed action works through the card menu, with stacks.

**Independent Test**: `quickstart.md` section 4.

- [X] T014 [US3] In `duel/duel-play.js` add `menuFor(place, instance)` returning the actions valid for the card's place (hand: normal summon, set, special summon, send to graveyard, banish, reveal; own field card: change position, flip face-up or face-down, send to graveyard, banish, return to hand, return to the top or bottom of the deck; graveyard or banished card: special summon, return to hand, return to the deck; deck pile: draw, shuffle, search, look at the top; extra deck card: special summon) and `act(action, uid, target)` that builds the public event (adding the card data only when the move makes it visible) and sends it as an intent; refusals (a card that is not where the page showed it, an empty pile) are reported in the page's message line
- [X] T015 [US3] In `duel/views/duel-board-view.js` add the card menu (opens on selecting an own card, one button per action, closes on Escape or choosing) and the zone picker (the valid destination zones highlight and are selectable; stacks accept a new card on top); opponent cards offer no menu; in `duel/duel-play.js` update the private state through `onApplied` only for the device's own events, and write the log lines
- [X] T016 [US3] Add the deck actions: `Draw` moves the top private card to the hand (public: hand +1, deck −1), `Search deck` opens a private list of the deck from which the player takes one card to the hand and the deck is shuffled afterwards (public log: "searched the deck"), `Shuffle deck` logs a shuffle; `Special summon` from the extra deck places the card face-up in a monster zone with its data public
- [X] T017 [US3] Add the player's `Undo my last move` (button next to the existing undo): applies the public inverse through the table's undo and restores the private snapshot saved when the move was applied; refused with the existing reason when the last log entry is not the player's own move; test it with the real-time check (move, undo, move after the opponent moved)

**Checkpoint**: A full duel can be played by hand on both pages.

---

## Phase 6: User Story 4 - Private information stays private (Priority: P1)

**Goal**: Prove and keep hidden information hidden; add reveal.

**Independent Test**: `quickstart.md` section 5.

- [X] T018 [US4] Add the privacy test to `shared/contract-tests.js`: run a scripted duel through two sessions over the in-memory link with two decks of recognisably named cards, record every message sent in both directions, and check that no message contains the name, `apiId` or image of a card while it is in a hand, a deck, an extra deck or face-down, only when it is played face-up, flipped, sent face-up to a public pile or revealed; check deck order never appears; make it fail if a hand card's snapshot ever leaves the device early
- [X] T019 [US4] Implement `reveal` and `hide` of a hand card: the event carries the card data for the opponent's `revealed` list while the card stays in the hand; hiding removes it; the opponent's hand row shows revealed cards face-up and the rest as backs; a card that leaves the hand clears its reveal
- [X] T020 [US4] Verify the visibility rules on the board: set cards show as backs to the opponent and with a face-down marker plus identity to the owner; flipping publishes the card; sending a face-down card to the graveyard publishes it (public pile); banishing face-down keeps it hidden; searching the deck never publishes the list or the pick

**Checkpoint**: The privacy test passes and the visibility rules hold in the page.

---

## Phase 7: User Story 5 - Look at any visible card (Priority: P2)

- [X] T021 [US5] Open any visible card from the board (own hand, both fields, both graveyards, banished face-up cards, own extra deck, own face-down cards) with the card details window using `engines: false`; a face-down opponent card opens nothing but a "face-down card" note; the opponent's revealed hand cards open too

---

## Phase 8: User Story 6 - Keep playing through a drop, and play again (Priority: P2)

**Goal**: Private state survives reconnection; rematch.

**Independent Test**: `quickstart.md` section 7.

- [X] T022 [US6] Persist and restore the private state in `duel/duel-play.js`: save `ygoDuelPrivate` after every confirmed own event; on page load and after a reconnect restore it when its `duelId` matches the table's; when it does not (or is missing for a started duel) show "The private part of your duel was lost" and offer a rematch; the public table is restored from the creator's snapshot as before
- [X] T023 [US6] Implement rematch: a `Rematch` button proposes (`rematch` event), the other player gets an accept/decline choice, `rematch-accept` makes the creator apply `reset` (life points 8000, turn 1, board cleared, a log line, the old log kept), and each device reshuffles its own chosen deck, redraws 5 and sends `ready` again so the duel restarts with the same decks; declining leaves the duel unchanged
- [X] T024 [US6] Check the whole cycle with the real-time two-page test: play a few moves, close and reopen one page and reconnect (fields, both hands, counts and log restored, nothing duplicated or revealed), clear one side's private storage (the lost-state message), propose and accept a rematch, and propose and decline one

---

## Phase 9: Polish & Cross-Cutting

- [X] T025 Check every number added by this feature is a named constant at the top of its file, that `duel/views/` contains only DOM and CSS, that the simulator never writes decks or the collection (search `duel/` for `saveData`/`saveCollection` keys other than `ygoDuelRoom` and `ygoDuelPrivate`) and that the Duel Room without decks still works
- [X] T026 [P] Verify keyboard-only use (deck choice, selecting a card, choosing an action and a zone, undo, reveal, rematch, closing menus with Escape) and the phone-width layout with both fields and the hand reachable without sideways scrolling; fix what is found
- [ ] T027 Update `specs/018-duel-room/quickstart.md` and the Duel Room page text so the room describes cards and decks, then run `node shared/profiles.test.js` and open `shared/tests.html`, and walk through every section of this feature's `quickstart.md`

---

## Dependencies & Execution Order

- **Phase 1** (T001) is independent of the rest and can be done at any time before T021.
- **Phase 2**: T002, T003 and T004 in parallel; T005 needs T003; T006 after T002–T005; T007 is independent of T002–T006.
- **US1 (T008–T010)** needs Phase 2; T008 in parallel with T009.
- **US2 (T011–T013)** needs US1; T011 and T012 in parallel.
- **US3 (T014–T017)** needs US2; T014 → T015 → T016 → T017.
- **US4 (T018–T020)**: T018 can start after Phase 2 (it uses only pure rules and sessions); T019–T020 after US3.
- **US5 (T021)** after US2 and T001.
- **US6 (T022–T024)** after US3.
- **Polish** last.

### Parallel opportunities

- T002–T004 together; T011 with T012; T018 alongside US1–US3.

## Implementation Strategy

- **MVP**: Phase 2, US1, US2 and US3 (T002–T017): two linked players pick decks, start with 5 cards and play by hand with stacks and undo.
- **Then**: US4 (privacy proof and reveal), US5 (card details), US6 (reconnect and rematch), Polish.
- Validate after each phase with the matching `quickstart.md` section; the Duel Room without decks and the rest of the app must keep working after every commit.
