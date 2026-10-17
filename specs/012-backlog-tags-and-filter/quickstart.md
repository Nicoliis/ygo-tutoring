# Quickstart: Validating Backlog Tags & Filter

Serve the repo root statically; use a profile with a Backlog containing a mix of card types (a few Sandbox cards added from the database work well). Reset with `localStorage.clear()` if needed.

## Scenario 1: Wider tags and one-click details (US1)
1. Open Workshop → Backlog: every tag is wider; names up to ~24 characters fit with the rarity label.
2. Click a tag once: the details window opens immediately; no small corner image appears.
3. Tab to a tag and press Enter/Space: same result.
4. In Deckbuilding, tags inside engines and decks keep their old size and two-step click.

## Scenario 2: Scrollbar (US2)
1. With enough cards to scroll, the Backlog scrollbar is slim, themed and gets brighter on hover/drag.
2. With few cards no scrollbar appears.

## Scenario 3: Filter by type (US3)
1. Click the filter icon: a window opens with nine tabs.
2. Tick only "Spell", Apply: only Spell cards are listed.
3. Tick "Spell" and "Trap": both appear. Untick all, Apply: everything returns.
4. Open the window, change something, press Escape: nothing changes.

## Scenario 4: Values per tab (US4)
1. Open the Monster tab: only attributes, races and levels that exist in your monsters are offered.
2. Tick the tab, choose one attribute and one level, Apply: only matching monsters remain (any chosen value within a group, all groups together).
3. The Spell tab offers sub-types (Quick-Play, Continuous, ...); a tab with no cards says so.
4. Older cards without details: with a value selected they are hidden at first; after the window finished loading details they can match.

## Scenario 5: Active state, clearing, persistence (US5, FR-016)
1. With a filter applied the icon shows the active state and the number of ticked types.
2. Type in the name search too: both conditions apply.
3. Reload the page and open another Workshop screen: the same filter is applied.
4. Switch profile: the other profile has its own filter.
5. Use Clear (or "Clear filter" on an empty result): the full Backlog returns.

## Scenario 6: Keyboard and accessibility
1. Open the filter with the keyboard, move between tabs with the arrow keys, tick boxes with Space, Apply with Enter on the button.

## Automated check
- `shared/profiles.test.js` / `shared/tests.html` include cases for `groupOf`, `availableValues`, `matchesFilter` and filter persistence.
