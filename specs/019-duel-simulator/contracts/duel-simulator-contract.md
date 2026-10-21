# Contract: Duel Simulator

## Pure rules

```text
// duel-cards.js
buildDuelDeck(collection, deckId, side)     -> { ok, name, main: [instance], extra: [instance], reason? }   // reason when the main deck is empty
snapshotOf(card)                             -> snapshot            // the fields the details window needs
shuffled(list, random)                       -> new list            // Fisher-Yates with an injected random
// duel-private.js
newPrivate(duelId, side, deck, random)       -> private state (deck shuffled, STARTING_HAND drawn, hidden empty)
applyPrivate(priv, event)                    -> { priv, ok, reason? }   // the owner's side of draw, move, flip, search, shuffle, reveal; undo restores `priv.undo`
cardAt(priv, uid)                            -> instance | null
// duel-board.js
newSim()                                     -> sim
applyBoardEvent(sim, event)                  -> { sim, ok, reason?, inverse? }   // every event of data-model.md
```

Guarantees: pure and deterministic; counts and piles stay consistent (a card is in exactly one place); `applyBoardEvent` followed by the returned `inverse` gives back the previous public board; a face-down card is never put in the public board with its card data; applyPrivate never changes the public side.

## Table integration (`duel-table.js`)

`applyEvent(table, event)` delegates the simulator kinds to `duel-board.js`, stores them in `table.sim`, writes the log entry (text never reveals private data: "set a card", "drew a card", "searched the deck"), keeps `inverse` in the entry, and `undo` applies the inverse when the last entry is the player's own move.

## Session hook (`duel-session.js`)

`createDuelSession({ ..., onApplied(event, table) })`: called on both devices after an event is applied (own or the other's); the play layer uses it to update this device's private state when `event.by` is its own player.

## Behaviour (`duel/duel-play.js`)

- `chooseDeck(deckId)`: builds the duel deck from the saved collection (read only), keeps its private state, sends `ready`.
- On `start`: shuffle, draw `STARTING_HAND`, save private state.
- `menuFor(place, instance)` -> list of actions for the card's place; `act(action, uid, target)` builds the public event, sends it as an intent, and (through `onApplied`) updates the private side.
- `undo()`, `proposeRematch()`, `acceptRematch()`, restore of private state on load and after a reconnect.

## Views (`duel/views/`) — DOM only

- `renderBoard(rootEl, model, handlers)`: model = `{ sim, privateView: { hand, deckCount, extraCount, hiddenCards }, you, picking: { zone kinds } | null, menu: { uid, actions } | null }`; handlers = `{ onSelectCard(uid, place), onAction(action), onPickZone(zone, slot), onOpenPile(side, pile), onDetails(card), onCancel }`.
- `renderDeckChoice(rootEl, model, handlers)`: model = `{ decks: [{ id, name, mainCount, extraCount }], chosen, opponentReady }`.

## Card details window

`showCardDetailWindow({ ..., engines: false })` hides the engines panel; the simulator opens cards only through it.
