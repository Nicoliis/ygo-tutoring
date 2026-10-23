# Data Model: Duel Board and Fan Menu Redesign

Changes against [019's data model](../019-duel-simulator/data-model.md); everything not listed is unchanged.

## Constants (top of their files)

| File | Name | Value | Meaning |
|------|------|-------|---------|
| duel-board.js | `BOARD_LAYOUT` | `["dpppppe","gpppppp","bXSXSXB","PPPPPPG","EPPPPPD"]` | The board, lowercase = the opponent's, uppercase = mine |
| duel-board.js | `BOARD_LAYOUT_VERSION` | 2 | Marks a board of this layout in `sim.layout` |
| duel-board.js | `FIELD_SLOTS` | 11 (counted from the layout) | Playable zones per player |
| duel-board.js | `SHARED_SLOTS` | 2 (counted from the layout) | Shared zones |
| duel-board.js | `SIGNAL_KINDS` | `["activate","target","attack"]` | What a signal can say |
| duel-play.js | `SIGNAL_SECONDS` | 5 | How long a signal marker stays on this device |
| fan-layout.js | `FAN_BUTTON_PX`, `FAN_GAP_PX`, `FAN_MIN_RADIUS_PX`, `FAN_FIRST_SPAN_DEG`, `FAN_SUB_SPAN_DEG` | 56, 8, 70, 180, 120 | Fan geometry |
| removed | `MONSTER_ZONES`, `SPELL_ZONES`, `FIELD_ZONES`, `PENDULUM_ZONES`, `ZONE_SIZES`, `ZONE_KINDS` | | Replaced by the layout |

## Public board

```text
sim = { layout: 2, started, nocards, generation, rematch,
  players: [ side, side ],
  shared: [ stack, stack ],              // the two shared zones
  signal: { uid, kind, by, n } | null }  // the last signal; n counts signals
side = { deckName, ready, handCount, deckCount, extraCount,
  field: [ stack x 11 ],                 // replaces zones { monster, spell, field, pendulum }
  gy: [{ uid, card }], banished: [{ uid, card | null }], revealed: { uid: card } }
stack = [ { uid, faceUp, pos: "atk" | "def", card | null } ]   // bottom to top, as before
```

The owner of any card is `Number(uid.split("-")[0])`. A card in `players[s].field` is controlled by `s`; in `shared` by either player. Piles, counts and `revealed` always belong to the owner.

## Places

```text
Place = { zone: "hand"|"deck"|"extra"|"gy"|"banished"|"field"|"shared", slot?, side?, end?: "top"|"bottom", index? }
```

`field` slots are `0..10`, `shared` slots `0..1`. `side` is only needed for a `field` card controlled by the other player's field (the card's `from`) and for the destination of `give`; piles are always the card owner's.

## Events (changes)

```text
{ kind: "move", by, uid, from: Place, to: Place, faceUp, pos, card? }   // to a field slot: by's own field or a shared slot; to a pile: the owner's
{ kind: "give", by, uid, from: Place, to: { zone: "field", slot, side: 1 - by }, card }   // always face-up
{ kind: "signal", by, uid, signal: "activate"|"target"|"attack" }
{ kind: "signal-clear", by }
```

`flip`, `position`, `reveal`, `hide`, `draw`, `search`, `shuffle`, `ready`, `start`, `nocards`, `rematch*`, `reset` keep their 019 meaning (`flip` and `position` now use `{ zone: "field"|"shared", slot }`). `give` and `signal` events have no `inverse`.

## Validation rules (new or changed)

- The mover must control the card: it is in the mover's field, a shared zone, or (for hand, deck, extra) the mover's own piles.
- A move into a pile goes to the owner's pile; a move to a face-up pile (`gy`, face-up `banished`) needs `card`, and a mover who is not the owner and does not know the card is refused ("only its owner can send that face-down card there").
- A move into a field slot goes to the mover's own field or a shared slot; only `give` targets the other player's field.
- `give` needs the card on the mover's field or in a shared zone, with its data (face-up).
- Stacks never refuse a card for a rule reason; slots out of range are refused.

## Private state

Unchanged in shape. `applyPrivate` also runs on the owner's device for another player's `move` of one of its cards into `hand`, `deck` or `extra` (the play layer decides by the uid's side).
