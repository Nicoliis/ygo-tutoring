# Quickstart: Duel Board and Fan Menu Redesign

## Prerequisites
- `python3 dev-server.py`; two browser windows linked as in the Duel Room quickstart, each with a Workshop deck (ideally with an extra deck card).

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
`shared/tests.html`: board cells for both players, board events (play, move, banish, give control, shared zones, ownership), menu paths, fan bounds, the privacy scan and old-board detection pass.

## 2. The board (User Story 1)
Start a duel. Each window shows one 7 by 5 grid: the player's own deck at the lower right, extra deck at the lower left, graveyard at the right of the row above, banished zone at the left of the middle row, 11 playable zones, two shared zones in the middle; the opponent's cards upside down in the mirrored cells. Empty `X` cells cannot be chosen.

## 3. The fan menu (User Story 2)
Select a hand card: round buttons fan up (Play, Move to, Signal, and Details for the card window). Open each; the chosen button stays marked while the next fan opens. Escape or a click outside closes it. Do the same with a card at the top row and at the left edge of the window: the fan stays inside. Use the keyboard only (Tab or arrows, Enter, Escape).

## 4. Play (User Story 3)
Play > Face up > Straight > a zone; Play > Face down > Sideways > a shared zone. The other page: face-up card visible, face-down a back lying sideways. Choose Play on a placed card with the other facing/orientation in the same zone, then another zone. Cancel while picking a zone.

## 5. Move to (User Story 4)
Graveyard, Banish face up and face down, Hand, Deck on top / on bottom / shuffle, Extra deck (extra deck cards only). Give control to the opponent: they now move it; when it leaves the field it goes to your piles. Place a card in a shared zone from each window; the other player moves it to the owner's hand; try sending a face-down shared card to the graveyard (refused with a reason).

## 6. Deck and signals (User Story 5)
Deck pile: Draw, Mill, Search, Look at top, Shuffle. Signal Activate, Target, Attacks: a marker on both pages that fades after a few seconds; a face-down card is not named in the log; Reveal and Hide a hand card.

## 7. Everything else (User Story 6)
Rematch: both pages restart on the new board with the same decks. Undo a play, a move and a mill; Undo after Give control (refused). Close one window and reconnect: board, hands and log restored. Open a duel saved before this feature: the old-board notice and the rematch offer. Privacy: with the test hook, no message identifies a hand, deck or face-down card.
