# Quickstart: Duel Room

## Prerequisites
- Serve the folder (`python3 dev-server.py`) and open `duel/index.html` in two browser windows (or on two devices on the same network, or two networks over a tunnel/hosted copy).

## 1. Automated rules
```bash
node shared/profiles.test.js     # must end with "profiles contract: OK"
```
Open `shared/tests.html`: the duel table and code checks pass.

> Note: two tabs of the same browser share the browser's saved duel (one saved table per browser), so use two different browsers or devices to check "close and reopen the page"; reconnecting from the page that still shows the duel works in the same browser.

## 2. Link (User Stories 1 and 2)
1. Window A: "Create room": an invitation code appears; Copy puts all of it on the clipboard; the page says it is waiting for the reply.
2. Window B: "Join room", paste the code (try it with extra spaces, line breaks and a sentence around it): a reply code appears; Copy it.
3. Window A: paste the reply: both windows show "Connected" and the duel table within a few seconds, with both names.
4. Try an empty code, a damaged code, an old room's reply, and a second reply: each is rejected with a clear message and nothing breaks.

## 3. Table (User Story 3)
In both directions: change life points (−1500, set 3000), press Next phase through a whole turn, flip the coin, roll the die, rename yourself, undo your last change. Both windows always show the same values and the same log order; make two changes at the same moment and check they still match. Take a player to 0: the log marks the win and editing still works.

## 4. Failure, drop and reconnect (User Story 4)
1. Complete an exchange on a network that blocks direct links (or use a code after closing the other window): after about 30 seconds the page says the link failed and why, and offers new codes.
2. In a duel, close one window: the other says "Opponent disconnected" within 10 seconds and keeps the table.
3. Press Reconnect, exchange new codes: both pages show the creator's table, with a notice on the joiner's page if it differed.
4. Close and reopen the page: the last duel is offered; "Clear duel" asks for confirmation and starts over.

## 5. Tools area and privacy (User Story 5)
The Duel Room is listed under Tools; the page explains the two-code exchange in a few lines. In the browser's network/devtools view, only names and table data are sent over the link.

## 6. Layout and keyboard
At phone width the table stacks with no sideways scrolling; every control (create, join, paste, copy, life points, phase, coin, die, undo, reconnect) is reachable and operable by keyboard.
