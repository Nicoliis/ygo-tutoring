# Research: Duel Simulator

## 1. How to hide information with no server
- **Decision**: Split the state. The shared (public) table holds only what both players may see, plus **counts** for what they may not; each device keeps its own private state (hand, deck order, extra deck, face-down identities) in a separate storage key and never sends it. A card's identity is attached to an event only when the move makes it visible or the owner reveals it.
- **Rationale**: It is the only way to make "the opponent never sees it" true without a trusted server: the data is not on the opponent's device at all. It also fits the existing authority model, because every event is public and deterministic.
- **Alternatives**: Encrypted private data on both devices (key management, commit-reveal, much more work); sending everything and hiding it in the interface (the opponent could read it in the browser tools, which fails the privacy requirement).

## 2. One event stream, two kinds of state
- **Decision**: Moves are events applied by the shared rules (`applyEvent`) to the public board; each device also applies a move to its private state, but only after its own event is confirmed by the session (`onApplied` with `by` equal to the device's player). A rejected event therefore changes nothing anywhere.
- **Rationale**: No drift between what the opponent sees and what the owner holds, and no rollback logic: nothing private changes until the public side accepted.
- **Alternatives**: Optimistic private updates with rollback (complex); making the creator hold both private states (breaks privacy).

## 3. What the public board holds
- **Decision**: `sim.players[i]`: `{ deckName, ready, handCount, deckCount, extraCount, zones, gy, banished, revealed }`; `zones` has `monster` (5), `spell` (5), `field` (1), `pendulum` (2), each slot a **stack** (bottom to top) of `{ uid, faceUp, pos, card | null }`; `gy` and `banished` are lists of `{ uid, card | null }` (`card` null only for a face-down banished card); `revealed` maps hand uids to the cards the owner chose to show. Hand cards have no uid in the public state (only the count).
- **Rationale**: Exactly what is visible; cards in public piles carry their data so the opponent can open their details.
- **Alternatives**: Sending only ids and letting each side look cards up (the opponent does not own those cards, so it cannot look them up).

## 4. Events
- **Decision**: `ready` (deck chosen), `start` (the creator resolves it once both are ready: counts and a first turn), `draw`, `move`, `flip`, `position`, `reveal`/`hide`, `search`, `shuffle` (log only), `undo`, `rematch` and `reset`. A `move` carries `uid`, where it comes from and where it goes (zone, slot, stack placement or pile end), the visibility after the move, and the `card` data only when the result is public.
- **Rationale**: Few event kinds cover all listed actions; the generic `move` covers summon, set, special summon, send to graveyard, banish, return to hand or deck and extra deck summon, which differ only in destination and visibility.

## 5. Stacks with offset
- **Decision**: A field zone holds an ordered stack; the view draws card *k* of *n* with an offset of `k × STACK_OFFSET_PX` right and down (a small constant), the top card last so it is on top, and every card in the stack is its own selectable element. Moving a card in the middle removes only that card.
- **Rationale**: Clarified: zones allow stacking and lower cards stay accessible. A constant small offset keeps the stack inside the zone for the usual few cards; the count badge covers the rare large stack.

## 6. Undo
- **Decision**: Each applied move writes an *inverse event* in its log entry (public, no private data) and the mover keeps a private snapshot on its own device. Undo applies the inverse to the public board and restores the private snapshot. It is refused when the last log entry is not the player's own move, as in the existing table.
- **Rationale**: Same "last own change" rule as life points, no history to synchronise, and private data never enters the log.

## 7. Reconnect and rematch
- **Decision**: The public table is restored from the creator's snapshot as in the Duel Room; each device restores its private state from `ygoDuelPrivate` when its `duelId` matches; if it does not, the page says the private part was lost and offers a rematch. Rematch: one player proposes (`rematch`), the other accepts (a second event), the creator applies `reset` (life points, turn, board cleared, log kept with a line), and each device reshuffles its own deck from the same choice, redraws 5 and sends `ready` again.
- **Rationale**: Clean, uses only existing mechanisms, and works for either player proposing.

## 8. Moving cards: menu
- **Decision**: Select a card, a menu lists the actions valid for its place (hand: normal summon, set, special summon, send to graveyard, banish, reveal; field: change position, flip, send to graveyard, banish, return to hand, return to deck top/bottom; graveyard/banished: special summon, return to hand or deck; deck pile: draw, shuffle, search, look at the top; extra deck: special summon), a zone picker highlights destination zones when needed. Every action is a button with an accessible name.
- **Rationale**: Clarified: menu only. Menus work on touch and keyboard, and the list per place keeps each move within 3 steps.

## 9. Card details without engines
- **Decision**: `showCardDetailWindow` accepts `engines: false`; `openCardDetailModal` forwards it; the simulator uses it. A face-down opponent card opens nothing.
- **Rationale**: FR-014 and FR-020: the duel never changes the player's collection or engines.

## 10. Testing
- **Decision**: Node tests for the deck building, the private state, the board rules (every action and its inverse, stacks, counts, visibility) and a **privacy test** that runs a scripted duel through two sessions over an in-memory link and scans every message for the names of hidden cards. The page itself is verified with `quickstart.md` and the real-time two-page check.
- **Rationale**: SC-003 to SC-005 are rule properties and are best proved on the pure code.
