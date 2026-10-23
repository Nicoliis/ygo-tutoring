# Tasks: Duel Board and Fan Menu Redesign

**Input**: Design documents from `/specs/020-duel-board-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/duel-board-menu-contract.md, quickstart.md

**Tests**: The pure rules (board cells, board events, ownership and give control, signals, menu tree, fan geometry, privacy of messages, old-board detection) get automated checks in `shared/contract-tests.js`, as the plan states. The pages are verified with `quickstart.md`, headless screenshots at 360 px and 1280 px, and the real-time two-page check used for the Duel Room.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in `duel/views/` and behaviour stays outside it; **commit after each task or small group of related tasks** once its checks pass (standing request).

**One exception to "working at every commit"**: the old zone kinds (monster, spell, field, pendulum) and the list menu are replaced, not kept beside the new ones. Phase 1 is purely additive and keeps the page working. T006 to T011 swap the board and the menu: each task is committed as soon as its Node checks pass, but the page is only complete again at T011, so do T006 to T011 in one sitting.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] board, [US2] fan menu, [US3] play, [US4] move to, [US5] deck and signals, [US6] everything else

---

## Phase 1: Foundational (additive; the page keeps working)

- [X] T001 [P] Add to `duel/duel-board.js` (nothing existing is changed): the constants `BOARD_LAYOUT = ["dpppppe","gpppppp","bXSXSXB","PPPPPPG","EPPPPPD"]`, `BOARD_LAYOUT_VERSION = 2`, `FIELD_SLOTS` and `SHARED_SLOTS` counted from the layout (11 and 2), `SIGNAL_KINDS = ["activate","target","attack"]`; `boardCells()` returning the 35 cells `{ row, col, kind: "field"|"shared"|"deck"|"extra"|"gy"|"banished"|"empty", side: "own"|"opp"|null, slot }` as drawn for the viewer (uppercase = own, lowercase = opponent, the opponent's slots numbered by their own view, i.e. the layout turned 180 degrees; shared slots 0 and 1 left to right); `ownerOf(uid)` (the side prefix of `"<side>-<n>"` as a number); `isOldBoard(sim)` (true when `sim` exists and lacks `layout === BOARD_LAYOUT_VERSION`)
- [X] T002 [P] Create `duel/fan-layout.js` with `FAN_BUTTON_PX = 56`, `FAN_GAP_PX = 8`, `FAN_MIN_RADIUS_PX = 70`, `FAN_FIRST_SPAN_DEG = 180`, `FAN_SUB_SPAN_DEG = 120` at the top and the pure `fanLayout({ anchor, count, direction, span, buttonPx, gap, bounds })` returning the centre `{ x, y }` of each button on an arc: the radius is the smallest that keeps neighbouring buttons `gap` apart (never below the minimum), a single button sits straight along `direction`, and when any button would leave `bounds` the arc is flipped, then shifted, until all fit (clamping as a last resort)
- [X] T003 [P] Create `duel/duel-menu.js` with the menu tree as data and `menuFor(context)` (context = `{ place, card, faceUp, revealed, isExtraDeckCard }`) returning the first-level nodes `Play`, `Move to`, `Signal` with their children exactly as in `research.md` section 7 (Play > Face up | Face down > Straight | Sideways > `needsZone`; Move to > Graveyard | Banish > Face up | Face down | Hand | Deck > On top | On bottom | Shuffle | Extra deck (only when `isExtraDeckCard`) | Give control (only for a card on the field or in a shared zone; `needsZone`); Signal > Activate | Target | Attacks (not for a hand card) | Reveal or Hide (hand cards)); `deckMenu()` returning Draw | Mill | Search | Look at top | Shuffle; `resolvePath(nodes, ids)` returning `{ node, action }` where `action` is `{ kind: "play", faceUp, pos }`, `{ kind: "move", to, faceUp?, end? }`, `{ kind: "give" }`, `{ kind: "signal", signal }`, `{ kind: "reveal" | "hide" }` or a deck action
- [X] T004 Add contract tests to `shared/contract-tests.js` and register `duel/fan-layout.js` and `duel/duel-menu.js` in the Node list of `shared/profiles.test.js` and in `shared/tests.html`: the cells read as `BOARD_LAYOUT`, each side has 11 field slots and slot `n` of the opponent sits on the own slot `n` cell turned 180 degrees, the rows read exactly as `BOARD_LAYOUT` for the own view and as its 180 degree rotation for the opponent's, `ownerOf`, `isOldBoard`; `fanLayout` returns positions inside the bounds for anchors at every corner and edge and for 1 to 6 buttons, with no two buttons closer than `buttonPx`; every leaf of `menuFor` for each place (hand, field, shared, graveyard, banished, extra) resolves to an action, Extra deck appears only for extra deck cards, Give control only on the field; run `node shared/profiles.test.js` and confirm "profiles contract: OK"
- [X] T005 [P] Create `duel/views/duel-fan-view.js` and its styles in `duel/views/duel.css` (DOM only, not wired yet): `renderFan(rootEl, fan, handlers)` with `fan = { anchor, levels: [{ nodes, chosenId }] }` draws round buttons (at least 44 px, label inside, `aria-label`), positions each level with `fanLayout` (the first level opens up from the anchor, each next level outward from the chosen button of the previous one), keeps the chosen path marked, and handles keyboard (Tab and arrows move, Enter or Space chooses, Escape and a click outside call `onClose`); add constants for sizes in the CSS `:root`; check with a scratch page and headless screenshots at 360 px and 1280 px (anchors near each edge)

**Checkpoint**: new pure modules tested; the page still works exactly as in spec 019.

---

## Phase 2: User Story 1 - One board with 11 playable zones and two shared zones (Priority: P1) 🎯 MVP

**Goal**: The table shows the 7 by 5 board for both players.

**Independent Test**: `quickstart.md` section 2.

- [X] T006 [US1] Change the public board in `duel/duel-board.js`: remove `MONSTER_ZONES`, `SPELL_ZONES`, `FIELD_ZONES`, `PENDULUM_ZONES`, `ZONE_SIZES`, `ZONE_KINDS`; `side.zones` becomes `side.field` (an array of `FIELD_SLOTS` stacks) and `newSim()` gets `layout: BOARD_LAYOUT_VERSION`, `shared` (`SHARED_SLOTS` stacks) and `signal: null`; places are `{ zone: "field"|"shared", slot }` for stacks; `takeCard`, `putCard`, `flip`, `position` and `publicCardName` work on them (shared stacks included); a move into a field slot or a shared slot is always accepted (never refused for a card type); update every existing 019 board and table test in `shared/contract-tests.js` to the new places, and add tests for a stack in a shared zone and a flip and position change there; `node shared/profiles.test.js` passes
- [X] T007 [US1] Update `duel/duel-table.js`: replace `ZONE_WORDS` by `field: "playable zone"` and `shared: "shared zone"` (keeping the pile words) so log lines read as before; `describeSim` unchanged otherwise; check the existing log tests pass
- [X] T008 [US1] Rewrite `duel/views/duel-board-view.js` for the single grid: `renderBoard` builds one 7 by 5 CSS grid from `model.cells` (from `boardCells(you)`), places each cell (a field slot with its stack, a shared slot with its stack, the deck, extra deck, graveyard and banished piles with their counts, `X` cells as non-interactive blanks) and draws the opponent's cards turned 180 degrees (combined with sideways for defense), with the hands above and below the grid as before; remove `PLACEMENT`, the two-field layout and the old list menu code; update `duel/views/duel.css` (grid columns from a `--duel-board-columns: 7` constant, card sizes, 40 px cards at phone width so the grid fits 360 px without sideways scrolling, removal of the rotated `.duel-side-opponent`); keep `STACK_OFFSET_PX` for stacks (negated for the opponent's stacks)

**Checkpoint** (after T011): quickstart section 2 passes.

---

## Phase 3: User Story 2 - A fan menu that opens above a card (Priority: P1)

**Goal**: Selecting a card or the deck pile opens the fan; the old list menu is gone.

**Independent Test**: `quickstart.md` section 3.

- [X] T009 [US2] Wire the fan in `duel/duel-play.js`: replace `ACTION_LABELS`, `ZONES_FOR`, `menuFor`, `actionList`, `chooseAction` and the list-menu state with the tree of `duel-menu.js`: selecting an own card (hand, field, shared, pile list) builds `menuFor({ ... })` and shows the first fan anchored on the card's element (the board view reports the anchor rectangle through `onSelectCard(uid, place, anchor)`); each chosen button either opens the next level (`children`) or resolves the action; `onCancel` (Escape, outside click) closes everything; a selected opponent card only offers details as before; `duel-board-view.js` mounts `renderFan` over the board; check the first level and each level opens, marks the chosen path and closes
- [X] T010 [US2] Keep the fan on screen and operable: the board view passes the window rectangle as `bounds` (the visual viewport on phones), fans for cards in the top row and at the left and right edges are flipped or shifted by `fanLayout`; a fan reopens correctly after a redraw caused by the other player's event (the open menu follows the card or closes if the card moved); focus moves to the first button when it opens and back to the card when it closes; verify with headless screenshots at 360 px and 1280 px for a hand card, a top row card and a corner card

---

## Phase 4: User Story 3 - Play a card: face, orientation, then any zone (Priority: P1)

**Goal**: Play > Face up or down > Straight or sideways > a zone of the player's board.

**Independent Test**: `quickstart.md` section 4.

- [X] T011 [US3] Wire Play in `duel/duel-play.js` and `duel/duel-menu.js`: after the last Play button, the zone picking highlights the player's 11 field slots and the 2 shared slots (the board view shows a "Here" button in each, as in 019, plus a Cancel and the existing note); picking a zone builds the event through a pure helper `playEvent({ uid, from, to, faceUp, pos, entry, card })` in `duel/duel-menu.js`: a card from the hand or a pile is a `move` (with `card` only when played face-up), a card already in a zone is a `flip` when only the facing changes, a `position` when only the orientation changes, both in that order when both change, and a `move` when the zone changes (keeping the card's data public only if it ends face-up); Straight is `pos: "atk"`, Sideways `pos: "def"`; add tests for `playEvent` in `shared/contract-tests.js`; at this point the whole page works again with Play only: run the real-time two-page check for hand to field face-up straight, face-down sideways and a flip in place

**Checkpoint**: `quickstart.md` sections 2 to 4 pass.

---

## Phase 5: User Story 4 - Move to graveyard, banish, hand, deck, extra deck, or give control (Priority: P1)

**Goal**: Move to, with banish facings, deck positions, extra deck and Give control; shared zones and ownership.

**Independent Test**: `quickstart.md` section 5.

- [X] T012 [US4] Add ownership, shared and Give control rules to `duel/duel-board.js`: a move into a pile always goes to `ownerOf(uid)`'s side whoever moves it; the mover must control the card (their own field, a shared zone, or their own piles); `from.side` lets a controller move a card out of the field it is in; a move to a face-up pile (`gy`, face-up `banished`) by a player who is not the owner and does not hold the card data is refused with "Only its owner can send that face-down card there"; new event `give` (`by`, `uid`, `from`, `to: { zone: "field", slot, side: 1 - by }`, `card` required) moves a card from the mover's field or a shared zone into a slot of the other player's field, always face-up, without an `inverse`; moves of a card that is not the mover's own and gives have no `inverse`; add `give` to the table kinds in `duel/duel-table.js` (`SIM_KINDS`, log text "Ana gave control of X to Ben") and make Undo refuse these with its existing message; add tests: give and give back, the controller moving the card away (it lands in the owner's piles and counts), a face-down shared card moved to the other player's hand and refused to the graveyard, undo of own moves still works, undo after a give is refused
- [X] T013 [US4] Update the owner's private state in `duel/duel-play.js` `onDuelEvent`: when another player's `move` sends a card whose `ownerOf` is this device's side to its `hand`, `deck` or `extra`, run `applyPrivate` with the event on this device (and save and redraw); add a test of the pure part with two private states following the same event stream (the board counts and both private states stay equal in size to the cards each player started with, over a random sequence that includes gives and shared zone moves)
- [X] T014 [US4] Wire Move to in `duel/duel-play.js`: Graveyard, Banish > Face up or Face down, Hand, Deck > On top | On bottom | Shuffle (a card into the deck then a `shuffle` event), Extra deck, and Give control (zone picking over the opponent's 11 slots, then `give`) become `move` or `give` events through `resolvePath` actions; cards selected from the graveyard, banished and extra deck lists (`openPile`, `pileItems`) open the same fan (FR-016); the log lines for banishing face-up or face-down read as before; run the real-time check for each destination, give control, a shared zone placement by each player and the refusal message

**Checkpoint**: `quickstart.md` sections 2 to 5 pass.

---

## Phase 6: User Story 5 - Deck menu and signals (Priority: P2)

**Goal**: Draw, Mill, Search, Look at top, Shuffle; Activate, Target, Attacks, Reveal and Hide.

**Independent Test**: `quickstart.md` section 6.

- [X] T015 [US5] Wire the deck fan in `duel/duel-play.js`: selecting the deck pile opens `deckMenu()` as a fan; Draw, Search (the existing private deck list that adds a card to the hand, then `shuffle`), Look at top (the existing details window) and Shuffle behave as in 019; Mill sends the top card of the deck to the graveyard as a `move` from `deck` to `gy` with its card data (an empty deck reports "Your deck is empty."); remove `openDeckMenu`, `deckAction` list code that is replaced
- [X] T016 [US5] Add signals to `duel/duel-board.js` and `duel/duel-table.js`: event `signal` (`by`, `uid`, `signal` in `SIGNAL_KINDS`) stores `sim.signal = { uid, kind, by, n }` with `n` one higher than before (the card must be on the field, a shared zone or a public pile, otherwise refused), event `signal-clear` sets it to `null`; neither has an `inverse`; log text "Ana's X activates" / "targets" / "attacks" naming the card only through `publicCardName` and "a card" otherwise; add both kinds to `SIM_KINDS`; tests: counter, replacing a signal, face-down card not named, refusal for a hand card
- [X] T017 [US5] Wire Signal in `duel/duel-play.js` and the board view: Activate, Target and Attacks send `signal`; Reveal and Hide (hand cards) send the existing `reveal` and `hide`; the board view draws a marker (an icon and a word) on the card whose uid matches `model.signal`; the behaviour layer hides the marker on this device after `SIGNAL_SECONDS = 5` (a local timer and redraw, nothing sent), a manual click on the marker sends `signal-clear`; markers disappear when the card leaves the field; add `--duel-signal-*` colors to `duel/views/duel.css`; check on both pages

**Checkpoint**: `quickstart.md` sections 2 to 6 pass.

---

## Phase 7: User Story 6 - Everything else keeps working (Priority: P2) and Polish

**Goal**: Privacy, undo, reconnect, rematch and card details on the new board; old duels reported; no dead code.

**Independent Test**: `quickstart.md` section 7.

- [X] T018 [US6] Old duels in `duel/duel-room.js` and `duel/views/duel-view.js`: when a saved or received table has `isOldBoard(table.sim)` true, show "This duel used the old board and cannot continue" with the rematch controls (the existing propose, accept and decline) instead of the board; after `reset` the page shows the deck choice with the previous deck name highlighted when a deck of that name exists; no error screen; add a test that `reset` of an old-board table yields a layout 2 board
- [X] T019 [P] [US6] Extend the privacy test in `shared/contract-tests.js`: a long simulated duel using the new events (play face-down in a field and a shared zone, give control, signals, banish face-down, mill, search, shuffle, move to deck positions, reveal and hide) where every message produced is scanned: none contains the name or data of a hand, deck, extra deck or face-down card before it becomes visible, and none contains a hidden uid order for the deck
- [X] T020 [P] [US6] Remove what is dead: grep the whole repository for `monster`, `spell`, `pendulum`, `ZONE_KINDS`, `ZONE_SIZES`, `PLACEMENT`, `ACTION_LABELS`, `duel-menu-title` and the old list menu CSS (`.duel-menu` styles) and remove any leftovers; `shared/tests.html` and `node shared/profiles.test.js` still pass
- [X] T021 [US6] Run the real-time two-page check (Chromium CDP runner from earlier) for a whole duel: start, play both facings and orientations, move to every destination, give control, shared zone use by both players, signals, deck fan, undo, reconnect after closing one page, rematch; take headless screenshots at 360 px and 1280 px and confirm the grid and fans fit without sideways scrolling; fix what fails
- [ ] T022 Run the whole `quickstart.md` walkthrough on two devices or browsers, tick the sections in this file and mark spec 019's open T027 as covered by it; commit

---

## Phase 8: Practice alone (added after the first release)

- [X] T023 Practice alone, a way to test a deck without a friend: a "Practice alone" button on the Duel Room start screen starts the same table with no link, the player as creator and an empty "Practice opponent" side (`startPractice` in `duel/duel-room.js`, `session.intentFor(by, event)` in `duel/duel-session.js`, `practiceReply` in `duel/duel-play.js`: the empty side is ready at once, accepts a rematch and its turn passes by itself); nothing is saved; "Leave practice" returns to the start screen; test in `shared/contract-tests.js` and the browser run
- [X] T024 Three-column table layout (added after the first release): the board about 60% of the width, a thin column of vertical turn controls (phases, next phase, coin, die, undo, rematch) about 10%, and about 30% for the opponent's life, the log (fixed height, scrolls) and your life, in that order from the top; below 900 px wide the columns stack, and a duel without cards stays stacked (`duel/views/duel-view.js` `buildTable`, `duel/views/duel.css`)
- [X] T025 The game is the main focus on the table: the page header ("Duel Room", "← Menu · Tools"), the sidebar and the practice explanation are hidden while a table is shown (`body.duel-focus`), and the way out is a "Leave practice" or "Leave room" button under the rematch button in the turn column
- [X] T026 The table uses the whole screen and has a card display on the left: four columns, card display | board | turn controls | lives and log (`duel/views/duel-card-view.js`, `duel/views/duel.css`; only the board (no wider than its 7 cards need) and the turn controls have a maximum width, the card display (its picture at most half the screen high), the lives and the log grow with the screen and the log takes the column height left by the two life panels; coin and die results are shown one above the other); pointing at or focusing any card you may see (hand, board, top of a public pile, a revealed card) shows its picture and details there; the card size follows the window height so the board and both hands fit; below 900 px wide the display is hidden and the Details button of the fan shows a card

---

## Dependencies & Execution Order

- **Phase 1** (T001 to T005) has no dependencies; T001, T002, T003 and T005 can run in parallel, T004 follows T001 to T003.
- **Phase 2 to 4** (T006 to T011) are done in one sitting in order: T006 before T007 and T008; T009 needs T003, T005 and T008; T010 needs T009; T011 needs T009 and T010. The page is complete again after T011.
- **Phase 5**: T012 before T013 and T014; T014 needs T011.
- **Phase 6**: T015 needs T011; T016 can follow T012; T017 needs T016.
- **Phase 7**: T018 after T011; T019 after T016; T020 after T017; T021 and T022 last.

## Parallel Opportunities

- T001, T002, T003 and T005 touch different files.
- T019 and T020 can run in parallel with each other once their prerequisites are done.

## Implementation Strategy

- **MVP**: Phase 1 to Phase 4 (T001 to T011): the new board with the fan menu and Play only.
- Then Phase 5 (Move to, give control, shared zones), Phase 6 (deck and signals), Phase 7 (old duels, privacy, cleanup, real-time check).
- Commit after each task as its checks pass.
