# Data Model: Duel Simulator

## Constants (top of their files)

| File | Name | Value | Meaning |
|------|------|-------|---------|
| duel-cards.js | `STARTING_HAND` | 5 | Cards drawn at the start |
| duel-board.js | `MONSTER_ZONES` / `SPELL_ZONES` / `FIELD_ZONES` / `PENDULUM_ZONES` | 5 / 5 / 1 / 2 | Slots per zone kind |
| duel-board.js | `ZONE_KINDS` | `["monster","spell","field","pendulum"]` | Zone kinds that hold stacks |
| duel-board.js | `PILES` | `["hand","deck","extra","gy","banished"]` | The other places a card can be |
| duel views | `STACK_OFFSET_PX` | 6 | Offset of each lower card of a stack (x and y) |
| duel-play.js | `PRIVATE_KEY` | `ygoDuelPrivate` | Where this device keeps its private state |

## Card in play (an instance)

```text
instance = { uid, card }              // uid "<side>-<n>" (side 0|1), unique within the duel; card = snapshot
snapshot = { apiId, name, type, race, attribute, level, atk, def, desc, effect?, imageSmall, imageFull, ... }   // what the details window needs
```

Each copy in a deck is its own instance. A snapshot is sent to the other player only when the card becomes visible.

## Private state (this device only; saved under `ygoDuelPrivate`)

```text
{ duelId, side, deckName,
  hand: [instance], deck: [instance] (top first), extra: [instance],
  hidden: { uid: snapshot },          // identities of this player's face-down cards on the field and face-down banished
  undo: { eventSeq, before } | null } // snapshot to restore when the last own move is undone
```

## Public board (inside the shared table: `table.sim`; `null` when no cards are used)

```text
sim = { started, generation,                  // generation counts rematches
  players: [ side, side ] }
side = { deckName, ready,
  handCount, deckCount, extraCount,
  zones: { monster: [stack x5], spell: [stack x5], field: [stack x1], pendulum: [stack x2] },
  gy: [{ uid, card }], banished: [{ uid, card | null }],
  revealed: { uid: card } }                    // hand cards the owner chose to show (the card stays in the hand)
stack = [ { uid, faceUp, pos: "atk" | "def", card | null } ]   // bottom to top; card null when face-down
```

## Events (added to the table events of the Duel Room)

```text
{ kind: "ready", by, deckName, mainCount, extraCount }
{ kind: "start", by: 0 }                        // creator, resolved once both are ready; sets counts and hands to STARTING_HAND
{ kind: "draw", by }
{ kind: "move", by, uid, from: Place, to: Place, faceUp, pos, card? }
{ kind: "flip", by, uid, zone, slot, faceUp, card? }
{ kind: "position", by, uid, zone, slot, pos }
{ kind: "reveal" | "hide", by, uid, card? }
{ kind: "search" | "shuffle", by }              // log only
{ kind: "rematch", by } | { kind: "rematch-accept", by } | { kind: "reset", by: 0 }
Place = { zone: "hand"|"deck"|"extra"|"gy"|"banished"|"monster"|"spell"|"field"|"pendulum", slot?, end?: "top"|"bottom", index? }
```

`card` is present only when the move makes the card visible to the opponent. Each log entry of a move also carries `inverse` (the event that reverts it, without private data).

## Validation rules

- A player's events only touch that player's side of the board.
- A move from `hand`, `deck` or `extra` needs that count to be above 0; from a field zone or a pile it needs the uid to be there.
- A card in a public pile (`gy`, face-up zone, face-up `banished`, `revealed`) always carries its snapshot; a face-down card never does in the public board.
- Counts never go below 0; the sum of a player's cards (hand + deck + extra + zones + piles) stays equal to the cards they started with.
- Moves into a field zone push onto the stack; they are never refused for rule reasons.

## Messages

No new message types: simulator events travel inside the existing `event`, `snapshot` and `intent` messages; the board is part of the table in a `snapshot`.
