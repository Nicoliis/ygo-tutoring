# Contract: Duel Room

## Page

`duel/index.html`: listed in the Tools area as "Duel Room". Works as a static page; no network use apart from the link between the two players and the public STUN address.

## Pure rules (`duel/duel-table.js`)

```text
newTable(duelId, creatorName, joinerName)  -> table
applyEvent(table, event)                    -> { table, ok, reason? }   // new table with a numbered log entry; ok false when refused (e.g. undo with nothing to undo)
describeEvent(table, event)                 -> string                   // the log line
```

Guarantees: pure and deterministic; the same table and the same event always give the same result; life points never below 0; phases in order; `undo` only reverts the last own `lp`/`phase` entry.

## Codec (`duel/duel-code.js`)

```text
encodeCode({ kind, roomId, sdp })  -> string   // "YGO1." + base64url(JSON)
decodeCode(text)                   -> { ok: true, kind, roomId, sdp } | { ok: false, reason }
```

`decodeCode` accepts surrounding whitespace, line breaks and chat text, rejects damaged, wrong-version or oversized codes with a reason.

## Link (`duel/duel-link.js`)

```text
createLink({ onStatus, onMessage }) -> {
  createOffer() -> Promise<code>, acceptOffer(code) -> Promise<code>, acceptAnswer(code) -> Promise<void>,
  send(message) -> boolean, close()
}
```

Statuses: `"gathering" | "waiting-reply" | "connecting" | "connected" | "disconnected" | "failed"`. A link that does not open within `CONNECT_TIMEOUT_MS` reports `failed` with a reason; sending is allowed only when connected; incoming messages are checked against the allowlist before `onMessage`.

## Room behaviour (`duel/duel-room.js`)

- Creator: `createRoom()` → code → `submitReply(text)`; Joiner: `joinRoom(text)` → reply code.
- Both: `intent(event)` (creator applies locally; joiner sends); the creator's `event` messages drive the joiner's table; `reconnect()` repeats the exchange for the saved duel; `clearDuel()` after confirmation.
- Saves the table after every applied event; restores on page load.

## Views (`duel/views/duel-view.js`) — DOM only

`renderRoom(rootEl, model, handlers)`: model = `{ phase: "start" | "creating" | "joining" | "connected" | "disconnected" | "failed", code, codeLabel, status, message, table, you, notice }`, handlers = `{ onCreate, onJoin(text), onSubmitReply(text), onCopy, onLpChange(target, mode, amount), onNextPhase, onCoin, onDie, onUndo, onRename(name), onReconnect, onClearDuel, onStartOver }`.
