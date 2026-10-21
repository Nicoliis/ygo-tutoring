# Tasks: Duel Room

**Input**: Design documents from `/specs/018-duel-room/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/duel-room-contract.md, quickstart.md

**Tests**: The pure rules (duel table, code codec) get automated checks in the existing contract tests, as the plan states. The link and the page are verified with `quickstart.md`, including a two-tab loopback check in headless Chromium.

**Conventions** (project standing rules): every meaningful number is a named constant at the top of its file; rendering lives in `duel/views/` and behaviour stays outside it; **commit after each task or small group of related tasks** once its checks pass (standing request).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: [US1] create a room, [US2] join and complete the link, [US3] shared duel table, [US4] failure/drop/reconnect, [US5] Tools area and explanation

---

## Phase 1: Setup

- [X] T001 Amend `.specify/memory/constitution.md` to version 1.1.0 (MINOR): Principle II and the "local only" constraint allow, in the Duel Room only, a player-to-player link carrying just names and the duel table plus a public STUN lookup, with the rationale; update the Sync Impact Report and the version/date line
- [X] T002 Create the folder `duel/` and `duel/views/`, add `"duel"` to `AREA_FOLDERS` in `shared/areas.js`, and add the page `{ label: "Duel Room", href: "duel/index.html" }` to the Tools area pages (the page itself arrives in a later task; until then the entry is added together with the page in T012)

---

## Phase 2: Foundational (blocks all user stories)

- [X] T003 [P] Create `duel/duel-table.js` with the constants at the top (`STARTING_LP = 8000`, `DUEL_PHASES = ["Draw", "Standby", "Main 1", "Battle", "Main 2", "End"]`, `LOG_MAX_ENTRIES = 500`, `NAME_MAX = 24`, `LP_AMOUNT_LIMIT = 1000000`) and the pure rules from `data-model.md`: `newTable(duelId, creatorName, joinerName)`, `applyEvent(table, event)` returning `{ table, ok, reason }` (immutable; events `lp` add/set with life points never below 0, `phase` in order with the turn rising after End and the other player active, `coin`, `die`, `name` trimmed to 1–24 characters, `undo` of the last log entry only when it is the undoing player's own `lp` or `phase` entry and refused with a reason otherwise), a numbered log entry per event with the before/after values, a `win` log entry the first time a player reaches 0, and `describeEvent`
- [X] T004 [P] Create `duel/duel-code.js` with `CODE_PREFIX = "YGO1."`, `CODE_VERSION = 1`, `CODE_MAX_LENGTH` and the pure `encodeCode({ kind, roomId, sdp })` (prefix + base64url of `{ v, k, r, s }`, UTF-8 safe) and `decodeCode(text)` (finds the first `YGO1.[A-Za-z0-9_-]+` token in the pasted text, so extra whitespace, line breaks and chat text do not matter; rejects empty, damaged, wrong-version, wrong-kind and oversized codes with a reason)
- [X] T005 Add contract tests to `shared/contract-tests.js` for both modules: starting table (8000 each, turn 1, Draw, creator active); life points add/subtract/set and never below 0; a win logged once; phases in order and the turn passing after End; coin/die results taken from the event; name trim and limits; `undo` reverting only the undoing player's last lp/phase entry and refusing the rest; the log is numbered consecutively and capped at `LOG_MAX_ENTRIES`; the same table and event always give the same result; code round trip, tolerant paste (spaces, line breaks, surrounding text), rejection of empty/damaged/wrong-version/oversized codes; register `duel/duel-table.js` and `duel/duel-code.js` in the Node list of `shared/profiles.test.js` and in `shared/tests.html`; run `node shared/profiles.test.js` and confirm "profiles contract: OK"

**Checkpoint**: the constitution allows the link and the pure rules pass their tests.

---

## Phase 3: User Story 3 - Play on a shared duel table (Priority: P1)

**Goal**: The table, the log and the controls work and stay identical on both sides. Built first, over a stand-in link, so it can be tested before the network exists.

**Independent Test**: `quickstart.md` section 3 (and a local two-table check in tests).

- [X] T006 [P] [US3] Create `duel/views/duel-view.js` with `renderRoom(rootEl, model, handlers)` for the connected table first: both players' names (editable) and life points with `+`/`−`/`set` controls, the turn counter, whose turn it is and the phase bar with a Next phase button, the coin and die buttons with their last results, the Undo button, and the event log (newest in view, scrollable); DOM only, no state, accessible names, `aria-live` for the log
- [X] T007 [P] [US3] Create `duel/views/duel.css`: the room layout (two player panels, the phase bar, the log), the table stacking on narrow windows with no sideways scrolling, focus styles and named sizes in CSS variables at the top
- [X] T008 [US3] Create `duel/duel-room.js` with the table behaviour over an injected transport (so it works with a stand-in): the authority rule (the creator applies its own intents and the joiner's intents in arrival order, resolves random coin and die results, numbers each event and sends `event { seq, event }`; the joiner sends `intent` and applies only the next `seq`, asking for a `snapshot` on a gap), saving the table to `localStorage` key `SAVED_DUEL_KEY = "ygoDuelRoom"` after each applied event and restoring it on load
- [X] T009 [US3] Add tests (in `shared/contract-tests.js`, with two tables wired through a fake in-memory transport) that two sides stay identical after interleaved intents from both players (including simultaneous ones, 200 changes), that the joiner asks for a snapshot after a missing `seq`, and that the creator's snapshot replaces a different joiner table

**Checkpoint**: The table logic and its view work; the two sides stay identical in tests.

---

## Phase 4: User Stories 1 and 2 - Create, join and complete the link (Priority: P1)

**Goal**: Two real browsers link with two pasted codes and then use the table.

**Independent Test**: `quickstart.md` sections 2 and 3, and the two-tab loopback check.

- [X] T010 [US1] Create `duel/duel-link.js` with the constants at the top (`STUN_URL`, `CONNECT_TIMEOUT_MS = 30000`, `ICE_GATHER_TIMEOUT_MS = 4000`, `LIVENESS_PING_MS = 3000`, `LIVENESS_TIMEOUT_MS = 9000`) and `createLink({ onStatus, onMessage })` over `RTCPeerConnection` and one ordered reliable data channel: `createOffer()` (waits for candidate gathering to finish or for `ICE_GATHER_TIMEOUT_MS`, then returns the invitation code), `acceptOffer(code)` (returns the reply code), `acceptAnswer(code)`, `send(message)`, `close()`, the statuses of the contract, a failure after `CONNECT_TIMEOUT_MS`, and an allowlist check of every incoming message (`hello`, `snapshot`, `intent`, `event`, `ping`, `pong`) before `onMessage`
- [X] T011 [US1] In `duel/duel-room.js` add the creator flow: `createRoom()` (new room id, the code, waiting for the reply, `CODE_EXPIRY_MS = 600000` suggesting a new code), `submitReply(text)` (decode, check the room id matches, otherwise "does not belong to this room" and keep waiting, accept only the first reply that completes the link), the discard/start-over action, and the exchange of `hello` that starts the duel table when the channel opens
- [X] T012 [US2] In `duel/duel-room.js` add the joiner flow: `joinRoom(text)` (decode the invitation, "not valid" messages that keep what was typed, produce the reply code), then the duel table when the channel opens; create `duel/index.html` (title "Duel Room", the shared navigation scripts and styles, the scripts of the room in order, a short explanation of the two-code exchange and that no server keeps the duel); in `duel/views/duel-view.js` add the start screen (Create room / Join room), the code box with Copy (clipboard, with a select-all fallback), the paste boxes for the invitation and the reply, and the status line; make sure the Tools area entry from T002 points to the page
- [X] T013 [US1] Add a two-tab loopback check for the link (a short script run in headless Chromium against `python3 dev-server.py`: open two pages, create in one, join in the other, paste the reply, then change life points on each side and check both tables) and run it; if headless local candidates do not connect, record the limitation and verify by hand following `quickstart.md`

**Checkpoint**: Two browsers link by pasted codes and play the table.

---

## Phase 5: User Story 4 - Failure, drop and reconnect (Priority: P2)

**Goal**: Clear messages when the link fails or drops, and a way back into the same duel.

**Independent Test**: `quickstart.md` section 4.

- [X] T014 [US4] In `duel/duel-room.js` handle failure and drop: show a plain-language "could not connect" message after `CONNECT_TIMEOUT_MS` that explains some networks block direct links and offers new codes; send a `ping` every `LIVENESS_PING_MS` and treat silence for `LIVENESS_TIMEOUT_MS`, a closed channel or a failed connection as "Opponent disconnected" while keeping the table on screen; add the matching messages to `duel/views/duel-view.js`
- [X] T015 [US4] Add Reconnect and the saved duel: `reconnect()` repeats the code exchange for the saved `duelId` (the creator creates a new invitation, the joiner joins as before), on `hello` the creator sends a `snapshot` and the joiner replaces its table with it and shows a notice when it differed (creator's table wins); on page load a saved duel is offered ("Reconnect" / "Clear duel" with a confirmation); `duel/views/duel-view.js` gets the disconnected and saved-duel screens and the notice
- [X] T016 [US4] Check the failure paths by hand or by script: an expired or foreign reply, a second reply after the link is complete, a failed connection, closing one tab and reconnecting, closing and reopening the page; confirm the table, turn, phase and log come back in every case

**Checkpoint**: A duel survives drops and clear messages appear in every failure.

---

## Phase 6: User Story 5 - Tools area and explanation (Priority: P3)

- [X] T017 [US5] Confirm the Duel Room is listed in the Tools area and in the main menu, that the page shows the short explanation (two codes, direct link, no server keeps the duel, only names and the table are shared) and that nothing from the Backlog, engines, decks, profile or balance is read or sent by the page (search `duel/` for storage keys other than `ygoDuelRoom`)

---

## Phase 7: Polish & Cross-Cutting

- [X] T018 Check every number added by this feature is a named constant at the top of its file, that `duel/views/` contains only DOM and CSS, and that the page works with no profile-specific data
- [ ] T019 [P] Verify keyboard-only use (create, copy, paste, join, edit life points, next phase, coin, die, undo, reconnect, clear) and the narrow layout with no sideways scrolling; fix what is found
- [ ] T020 Run `node shared/profiles.test.js` and open `shared/tests.html`; then walk through every section of `quickstart.md`, including a run on two different devices if possible

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → stories**. T001 and T002 are independent; T003 and T004 in parallel, then T005.
- **US3 (T006–T009)** needs T003 and T005; T006 and T007 in parallel; T008 then T009.
- **US1/US2 (T010–T013)** need US3's behaviour (T008) and T004; T010 is independent of T006–T009 and can be built in parallel; T011 → T012 → T013.
- **US4 (T014–T016)** needs the link and the room flows.
- **US5 (T017)** after the page exists; **Polish** last.

### Parallel opportunities

- T003 with T004; T006 with T007; T010 with T006–T009; T019 in Polish.

## Implementation Strategy

- **MVP**: Phase 1, Phase 2, US3 and US1/US2 (T001–T013): two browsers link with pasted codes and share a synchronised table.
- **Then**: US4 (failure, drop, reconnect), US5 (Tools listing and explanation) and Polish.
- Validate after each phase with the matching `quickstart.md` section; the rest of the app must keep working after every commit.
