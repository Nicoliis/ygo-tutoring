# Data Model: Duel Room

## Constants (top of their files)

| File | Name | Value | Meaning |
|------|------|-------|---------|
| duel-table.js | `STARTING_LP` | 8000 | Life points each player starts with |
| duel-table.js | `DUEL_PHASES` | Draw, Standby, Main 1, Battle, Main 2, End | Phases of a turn, in order |
| duel-table.js | `LOG_MAX_ENTRIES` | 500 | Oldest log entries dropped beyond this |
| duel-code.js | `CODE_PREFIX` / `CODE_VERSION` | `YGO1.` / 1 | Code format marker |
| duel-link.js | `STUN_URL` | `stun:stun.l.google.com:19302` | Public address that helps browsers find a path |
| duel-link.js | `CONNECT_TIMEOUT_MS` | 30000 | Gives up on a link that does not open |
| duel-link.js | `ICE_GATHER_TIMEOUT_MS` | 4000 | Longest wait for connection candidates before showing a code |
| duel-link.js | `LIVENESS_PING_MS` / `LIVENESS_TIMEOUT_MS` | 3000 / 9000 | Heartbeat and the silence after which the opponent counts as gone |
| duel-room.js | `CODE_EXPIRY_MS` | 600000 | After this the page suggests a new invitation (10 minutes) |
| duel-room.js | `SAVED_DUEL_KEY` | `ygoDuelRoom` | Where the last duel is kept |

## Duel table (saved and exchanged)

```text
table = {
  duelId, seq,                              // seq = number of the last applied event
  players: [ { name, lp }, { name, lp } ],  // index 0 = creator, 1 = joiner
  turn,                                     // starts at 1
  active,                                   // 0 | 1: whose turn it is (creator starts)
  phase,                                    // one of DUEL_PHASES
  coin: "heads" | "tails" | null, die: 1..6 | null,
  winner: 0 | 1 | null,
  log: [ entry ]
}
entry = { seq, by: 0|1, kind: "lp"|"phase"|"coin"|"die"|"name"|"undo"|"win", text, before?, after? }
```

## Events (what `applyEvent` takes)

```text
{ kind: "lp", by, target: 0|1, mode: "add"|"set", amount }     // subtract = add with a negative amount
{ kind: "phase", by }                                           // next phase; after End: turn + 1, other player active
{ kind: "coin", by, result }                                    // result chosen by the creator
{ kind: "die", by, result }                                     // 1..6 chosen by the creator
{ kind: "name", by, name }                                      // name trimmed, 1..24 characters
{ kind: "undo", by }                                            // reverts the last log entry if it is this player's lp/phase entry
```

## Messages on the link (all JSON, nothing else is accepted)

```text
hello    { type, duelId, name }
snapshot { type, table }           // creator -> joiner, after hello
intent   { type, event }           // joiner -> creator (without seq and without random results)
event    { type, seq, event }      // creator -> joiner: the numbered event to apply
ping | pong { type }
```

## Codes

`YGO1.` + base64url(JSON `{ v: 1, k: "offer" | "answer", r: roomId, s: sdp }`). `decodeCode(text)` finds the first `YGO1.[A-Za-z0-9_-]+` token and returns `{ ok, kind, roomId, sdp }` or `{ ok: false, reason }`.

## Saved duel (`localStorage`)

`{ duelId, role: "creator" | "joiner", table }`; written after every applied event; cleared by "Clear duel".

## Validation rules

- Life points: integer, never below 0 in the table (a value below 0 is stored as 0); `set` amounts and `add` amounts are integers within ±1,000,000.
- A phase move always follows `DUEL_PHASES` order; the turn changes only after `End`.
- The creator numbers events consecutively; the joiner applies an event only when `seq` is the next number, otherwise it asks the creator for a `snapshot`.
- Names are trimmed text of 1–24 characters.
