# Research: Duel Room

Findings reuse the earlier research answer (Trystero/PeerJS/manual signalling, NAT limits).

## 1. Transport
- **Decision**: A browser data channel (`RTCPeerConnection` + `RTCDataChannel`, ordered and reliable) with the offer/answer exchanged by hand. No library.
- **Rationale**: It is built in, needs no server of ours, and matches "no backend". Manual exchange was the chosen option.
- **Alternatives**: A relay-based library (Trystero) or PeerJS Cloud (third-party brokers, a dependency); WebSocket/WebTransport (need a server); BroadcastChannel (same browser only).

## 2. Codes
- **Decision**: Gather ICE candidates fully (or up to `ICE_GATHER_TIMEOUT_MS`) before showing a code, so each code is one self-contained message; code = prefix `YGO1.` + base64url of a small JSON `{ v, k: "offer"|"answer", r: roomId, s: sdp }`. Decoding finds the first `YGO1.…` token in the pasted text, so extra whitespace, line breaks and chat text around it do not matter.
- **Rationale**: No trickle-candidate messages means exactly two pastes. A version prefix lets the format change later; the room id lets the creator reject a reply from another attempt (FR-005). Sync encoding keeps the codec Node-testable.
- **Alternatives**: Compressing with the browser's `CompressionStream` (async, harder to test, small gain for this size); trickle ICE (many messages).

## 3. Who decides the order of events
- **Decision**: The **creator is the authority**. The joiner sends intents; the creator resolves them into numbered events (including the result of a coin or die roll) and sends each event to the joiner; both apply the same pure `applyEvent`. The creator applies its own intents the same way, locally.
- **Rationale**: One writer gives a single total order, so simultaneous edits cannot diverge (FR-012, SC-003); results of randomness are decided once, so both pages show the same coin and die (FR-010). It also gives the clarified reconnect rule for free: the creator's table wins.
- **Alternatives**: Last-write-wins with timestamps (clocks differ; edits get lost); operational transforms or CRDT (far more than a few counters need).

## 4. The table and the log
- **Decision**: A pure `duel-table.js`: `table = { duelId, seq, players: [{name, lp}, {name, lp}], turn, active (0|1), phase, coin, die, log: [entry], winner }`; events: `lp` (add/subtract/set), `phase` (next), `coin`, `die`, `name`, `undo`. `applyEvent(table, event)` returns a new table with a log entry; the log entry keeps what it changed (before values) so `undo` can revert the **last log entry when it is the undoing player's own and is an `lp` or `phase` change**, else the undo is refused with a reason.
- **Rationale**: Deterministic, small, testable. Restricting undo to the last own life/phase entry avoids overwriting the other player's later edits.
- **Alternatives**: Full undo history (invites conflicts); no undo (the spec asks for it).

## 5. Connection states and messages
- **Decision**: States `idle → creating → joining → connecting → connected → disconnected | failed`. Messages (JSON): `hello {duelId, name}`, `snapshot {table}` (creator → joiner), `intent {event}` (joiner → creator), `event {seq, event}` (creator → joiner), `ping`/`pong` for liveness. A drop is detected by the channel closing, the connection state changing to failed/disconnected, or no pong for `LIVENESS_TIMEOUT_MS`. A connection attempt fails after `CONNECT_TIMEOUT_MS` = 30 s.
- **Rationale**: Few message types; liveness needs a timer because some drops are silent; the timeouts meet SC-004 and SC-005.

## 6. Reconnect and persistence
- **Decision**: After every applied event the table is saved to `localStorage` (`ygoDuelRoom`). Reconnect repeats the code exchange with the stored `duelId`; on `hello` the creator sends a `snapshot`, the joiner replaces its table with it and shows a notice when it differed. "Clear duel" deletes the saved table after a confirmation.
- **Rationale**: Clarified rule (creator's table wins) with no extra step; works after closing the page.
- **Alternatives**: Asking which table to keep (rejected in clarification).

## 7. What crosses the link
- **Decision**: Only `hello`, `snapshot`, `intent`, `event` and liveness messages; the table holds names, life points, turn, phase, coin, die and log text. A small allowlist validator rejects any other message type or field.
- **Rationale**: FR-020 and SC-007; a validator makes "nothing else is sent" checkable and protects a page from malformed messages.

## 8. Testing
- **Decision**: Node tests for `duel-table.js` and `duel-code.js`; a two-tab loopback test in headless Chromium for the link (both pages in one browser connect through local candidates); the page is otherwise verified with `quickstart.md`.
- **Rationale**: The rules carry the correctness (sync, order, undo, codes); the link wrapper is thin.
