# Contract: Duel Board and Fan Menu

## Pure rules

```text
// duel-board.js
BOARD_LAYOUT, BOARD_LAYOUT_VERSION
boardCells()                     -> [{ row, col, kind: "field"|"shared"|"deck"|"extra"|"gy"|"banished"|"empty", side: "own"|"opp"|null, slot }]   // 35 cells as drawn for the viewer (own = uppercase)
ownerOf(uid)                     -> 0 | 1
newSim()                         -> sim (layout 2)
applyBoardEvent(sim, event)      -> { sim, ok, reason?, inverse?, note? }   // events of data-model.md
isOldBoard(sim)                  -> true when a saved sim lacks layout 2
// duel-menu.js
menuFor(context)                 -> node[]            // context = { place, faceUp, revealed, isExtraDeckCard }; first level Play, Move to, Signal, Details
node = { id, label, children?: node[], action?: { kind, ... } , needsZone?: true }
resolvePath(nodes, ids)          -> { node, action } | null
// fan-layout.js
fanLayout({ anchor, count, direction, span, buttonPx, gap, bounds, avoid }) -> [{ x, y }]   // centres, inside bounds and clear of the `avoid` points
```

Guarantees: `boardCells(0)` and `boardCells(1)` describe the same 35 cells with sides swapped and each player's slot `n` at the same physical cell; a card is in exactly one place; a card that leaves the field is in its owner's piles; a face-down card is never put in the public board with its data; applying an event and then its `inverse` restores the board; `fanLayout` returns positions inside `bounds` for any anchor inside it; every leaf of `menuFor` resolves to an action.

## Behaviour (`duel-play.js`)

- `openFan(card or pile, anchor)`: builds the tree with `menuFor`, hands it to the fan view; a leaf with `needsZone` starts the zone picking over the 11 own slots and the 2 shared slots; any other leaf sends the event.
- `onDuelEvent`: also updates this device's private state when another player's event sends one of its cards to its hand, deck or extra deck.
- Old board: the room shows the notice and the rematch controls.

## Views (`duel/views/`) - DOM only

- `renderBoard(rootEl, model, handlers)`: model = `{ sim, you, hand, cardOf, picking: { slots: [{ zone, slot, side? }] } | null, selected, fan, signal }` (the grid comes from `boardCells()`); handlers = `{ onSelectCard(uid, place, anchor), onPickZone(zone, slot, side), onOpenPile(side, pile, anchor), onDetails(card), onFaceDown, onCancel, onClearSignal, fan }`.
- `renderFan(rootEl, fan, handlers)`: fan = `{ anchor, levels: [{ nodes, chosenId }] }`; handlers = `{ onChoose(levelIndex, nodeId), onClose }`. Arrow keys / Tab move between buttons, Enter or Space chooses, Escape or an outside click closes.
