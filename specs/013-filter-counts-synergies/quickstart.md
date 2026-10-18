# Quickstart: Validating Filter Counts & Synergy Tab

## Prerequisites
- Serve the folder (`python3 -m http.server 8000`) and open `http://localhost:8000`; create or pick a profile whose Backlog has at least 30 cards, including Monsters, Spells and Traps, some with quoted names in their effect (for example any "Elemental HERO" or "Blue-Eyes" card).
- Pure-logic checks: open `shared/tests.html` or run `node shared/profiles.test.js`; all contract tests must pass.

## Scenarios

1. **Counts match results** (US1): Backlog → filter icon → Monster tab. Note the count next to one attribute (e.g. DARK (n)). Tick only that attribute, Apply. The Backlog lists exactly n Monster cards of that attribute (include both normal and effect if both are ticked). Repeat with a Level, a Spell sub-type and a Trap sub-type.
2. **Tab and box counts** (US1): Each tab header shows its card total; the Monster tab shows "Include normal (n)" and "Include effect (n)" that add up to the Monster total.
3. **Counts stay fixed** (US1): In a tab, select a value in one group; the counts in the other groups do not change.
4. **Synergy tab lists names** (US2): Open the Synergy tab. It lists quoted names with counts, highest first; the search box narrows the list.
5. **Synergy selection is cross-type** (US2): Select one name, Apply. The Backlog lists cards of any type whose effect quotes that name or whose own name contains it; the number equals the count shown. A card that mentions the name only without quotes is not listed unless its own name contains it.
6. **OR within, AND with types** (US2): Select two names: the result is the union. Then also tick only the Spell tab: only Spell cards tied to either name remain.
7. **Persistence** (US3): Apply a synergy selection, reload and open another Backlog screen (Synergy Builder, Deckbuilding): same cards listed, icon shows active. Clear filter: all cards return.
8. **Discard** (US3): Select a name, close the window without Apply: nothing changes.
9. **Old record** (US3): With a profile saved before this feature, the filter loads normally with no synergy selection.
10. **Background completion** (edge): With cards lacking effect text, open the window; "Loading card details…" shows, then the Synergy list and counts update.
11. **Performance** (SC-004): With about 2,000 cards, the window opens and a synergy selection applies in under 1 s.
12. **Keyboard / screen reader** (FR-015): Reach the Synergy tab with arrow keys, tab to the search box and the checkboxes; each name is announced with its count.
