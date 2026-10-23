# Research: Duel Board and Fan Menu Redesign

## 1. One layout constant, cells per viewer
**Decision**: `BOARD_LAYOUT` (five strings) is the only description of the board. `boardCells(you)` returns, for each of the 35 cells, `{ row, col, kind, side, slot }` as seen by player `you`: own cells are the uppercase letters, the other player's the lowercase ones, `S` shared (slot 0 and 1 left to right), `X` empty. A slot is the index among a player's `P` cells in reading order **of that player's own view**: the opponent's slots are numbered from the cell the layout rotated 180 degrees gives them, so slot `n` is the same cell in both players' views.
**Rationale**: both pages then show the same duel from opposite sides with one table, and the lowercase/uppercase rule of the spec holds by construction (rotating `dpppppe/gpppppp` gives `ppppppg/epppppd`, exactly the bottom rows).
**Alternatives**: two layouts (own, opponent) - duplicates and can drift; rotating the whole opponent half with CSS (019) - impossible now that the middle row is shared.

## 2. Ownership from the uid, control from the place
**Decision**: the owner of a card is the side prefix of its `uid`. The controller is the player whose field holds it (or either player for a shared zone). A card leaving the field goes to the owner's piles. Give control moves the card to a chosen slot of the other player's field.
**Rationale**: no new field to keep in step; a pile never holds a foreign card; matches "when leaving the field it goes to the original owner".
**Alternatives**: an `owner` field on each stack entry - redundant with the uid.

## 3. Hidden cards under foreign control
**Decision**: Give control always turns the card face-up (it must travel with its card data), so a controller never holds a card they cannot identify. In a shared zone a player can place cards face-down; the other player may move such a card only to the owner's hand, deck, extra deck or face-down banished zone, never to a face-up pile, because they do not know it. The refusal says so. The owner's own device always knows its cards (private state), so the owner can do everything.
**Rationale**: keeps the privacy guarantee (nothing identified before it is visible) without a round trip to the owner.
**Alternatives**: ask the owner's device for the data (a new message and a wait) - more complex than the case deserves; forbid face-down in shared zones - removes a legitimate use.

## 4. Undo
**Decision**: a move is undoable only by its mover when the card is the mover's own and every place involved is on the mover's side or shared. Give control, moves of another player's card, and signals have no inverse; Undo then says so, as it already does for other players' moves.
**Rationale**: an inverse of a foreign move would have to change two devices' private states.

## 5. Signals
**Decision**: one public `sim.signal = { uid, kind, by, n }` (the last signal) plus a `signal-clear` event. The marker is drawn while `n` is the current signal; each device hides it locally after `SIGNAL_SECONDS` (a timer in the behaviour layer, not synced). A signal on a hand card is not offered (only Reveal is).
**Rationale**: no timing inside the pure rules; both pages agree on what was signalled and may differ only in when the marker fades, which is cosmetic. Several signals at once are not needed.
**Alternatives**: a list of markers with expiry times in the table - needs clocks that agree.

## 6. The fan: geometry and menu data
**Decision**: one fixed shape so the buttons can be found without looking (muscle memory). `fan-layout.js` puts the buttons of a fan on an arc of `FAN_RADIUS_PX` (80) straight above its anchor, left to right in menu order, spaced just far enough not to touch (a fan of two or three is a short arc, five nearly a semicircle; a longer one keeps to the semicircle with a wider radius). Every submenu is a fan straight above the button it came from, so each choice opens above the previous one; fans never turn or flip. Only the chosen button of each lower level stays on screen (choosing it again closes the levels above). When the fan would leave the window the whole fan is slid, keeping its shape (`fanShift`). `duel-menu.js` holds the tree as data (`label`, `children` or `action`) so tests can walk every path and the view stays dumb.
**Rationale**: the same button is always in the same place relative to the card (Play at the upper left, Move to next, then Signal and Details), and the chain Play, Face up, Straight is a short vertical climb; pure and testable.
**Alternatives**: turning or flipping fans to avoid the edges (the first version) - the buttons move around, so no muscle memory; SVG pie menu - harder to make accessible and to hit-test with touch.

## 7. Menu tree content
```
Hand / field / shared / piles card:
  Play        -> Face up | Face down -> Straight | Sideways -> choose a zone (11 own + 2 shared)
  Move to     -> Graveyard | Banish (Face up | Face down) | Hand | Deck (On top | On bottom | Shuffle) | Extra deck (extra deck cards only) | Give control (field and shared cards only)
  Signal      -> Activate | Target | Attacks (not for hand cards) | Reveal / Hide (hand cards)
Deck pile:    Draw | Mill | Search | Look at top | Shuffle
Piles (graveyard, banished, extra deck): selecting a card from its list opens the same card menu
```
Play on a card already in a zone: choosing its own zone with another facing/orientation is a flip and/or position change; another zone is a move. Straight is the attack position, sideways the defense position. "Move to Extra deck" is shown only for Fusion, Synchro, Xyz and Link cards, as the 019 rule did.

## 8. Old saved duels
**Decision**: `newSim()` sets `layout: BOARD_LAYOUT_VERSION` (2). A saved table whose `sim` lacks it is an old-board duel: the page shows that notice and the usual rematch controls; after the rematch's `reset` the new board starts at the deck choice, with the previous deck highlighted by name.
**Rationale**: the old and new zones cannot be mapped (011 slots versus 5+5+1+2 by kind); the private state is untouched so nothing else migrates.
