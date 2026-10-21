# Quickstart: Duel Simulator

## Prerequisites
- `python3 dev-server.py`; two browser windows (different browsers or devices for "close and reopen" checks; same browser is fine otherwise, see the Duel Room quickstart).
- Each window's profile has at least one Workshop deck with cards (and ideally an extra deck card).

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
`shared/tests.html`: deck building, private state, board rules, undo/inverse and the privacy scan pass.

## 2. Start (User Story 1)
Link the two windows as in the Duel Room quickstart; each picks a deck (counts shown); try a deck with no main cards (refused) and a profile without decks (continue without cards). When both are ready: each sees 5 cards in their own hand, the opponent's hand as 5 backs, life points 8000, turn 1.

## 3. Fields and hand (User Story 2)
Both fields visible, the opponent's upside down at the top; deck, extra, graveyard and banished counts; your hand as images, the opponent's as backs; open the graveyard of each side.

## 4. Moves (User Story 3)
For each action (draw, normal summon, set, special summon incl. from the extra deck, change position, flip, to graveyard, banish face-up/face-down, return to hand, return to deck top/bottom, shuffle, search deck) check the effect on both pages and the log line. Place several cards in the same zone: they stack with the lower ones offset and each one is selectable. Undo your last move; try to undo after the opponent moved (refused). You cannot move the opponent's cards.

## 5. Privacy (User Story 4)
With the devtools network or the test hook, check that nothing identifies a hand card, a deck card, the deck order or a face-down card before it is played face-up, flipped or revealed. Reveal a hand card and hide it again; search the deck and check the opponent only sees "searched".

## 6. Card details (User Story 5)
Open a card in the hand, on both fields, in both graveyards: details show without the engines panel. A face-down opponent card shows nothing about it.

## 7. Drop, reconnect and rematch (User Story 6)
Close one window mid-duel and reconnect with new codes: fields, both hands (private), counts, log restored. Clear one browser's site data and reconnect: the page says the private part was lost and offers a rematch. Propose a rematch, accept: both decks reshuffle, 5 cards each, life points 8000, the table is cleared; decline: nothing changes.

## 8. Layout and keyboard
Phone width: both fields and the hand usable without sideways scrolling; every zone, card and menu action reachable and operable by keyboard.
