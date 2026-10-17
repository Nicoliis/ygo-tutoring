# Quickstart: Validating Workshop, Store & Menu

Serve the repo root statically; use a Progression Run profile (and a Sandbox profile where noted). `localStorage.clear()` resets everything.

## Scenario 1: Menu areas (US6)
1. Pick a profile on the main menu: expect four area cards (Run, Workshop, Store, Tools).
2. Enter Workshop: sidebar shows only Backlog, Synergy Builder, Deckbuilding plus "Back to menu"; the theme differs from Store and Run.
3. Enter each area; the active profile stays the same; Booster Draft, Proxy Sheet Builder and Pack Puller are under Tools.

## Scenario 2: Reusable Backlog (US1)
1. Open Workshop → Backlog, Synergy Builder, Deckbuilding.
2. On each: cards listed with quantity and rarity badge, search filters, clicking opens details, dragging works.
3. In a Sandbox profile the "add from database" block is visible; in a Progression Run profile it is not.

## Scenario 3: Synergy Builder (US2)
1. Create an engine, drag three cards in, remove one, rename it, reload: everything persists.
2. Try to exceed owned copies or three per engine: refused with a message.

## Scenario 4: Deckbuilding (US3)
1. Create a deck; drag loose cards from the Backlog; add a whole engine in one action.
2. Expect a report of skipped cards when limits are hit; move cards between main/extra; delete with confirmation.
3. Decks created before this feature are present.

## Scenario 5: Selling (US4)
1. Open Store → Sell: balance shows 0.00 and is visible on every Store screen.
2. Sell one printing of a card pulled from a set with a known set price: balance rises by exactly that price, owned quantity drops by one.
3. A card without a recorded set price shows "no sale value" and its sell button is disabled.
4. Sell a copy that an engine/deck needs: confirmation appears; afterwards the engine/deck never holds more copies than owned.

## Scenario 6: Buying (US5)
1. With balance ≥ 4.75 and a reached booster at 1.00: buy 3 → preview total 4.75, charge 4.75, next price 3.38.
2. With insufficient balance: purchase blocked, nothing charged, missing amount shown.
3. Only boosters of reached stages are offered. Reload: balance, prices and inventory persist.
4. Open a bought booster from the Run area: same opener; cards go to the Backlog and the inventory count drops.

## Scenario 7: Sandbox without a balance
1. In a Sandbox profile open Store pages: a message says there is no balance, with links back.

## Automated check
- `shared/profiles.test.js` / `shared/tests.html` include cases for `money.js` pricing (100, 150, 225, 338; total 475), `canBuy`, `buyBoosters`, `canSell`, `sellPrinting`.
