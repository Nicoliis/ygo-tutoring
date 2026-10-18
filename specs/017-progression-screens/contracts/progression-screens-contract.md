# Contract: Progression Screens

## Pages (Run area, in this order)

| Page | File | Shows |
|------|------|-------|
| Progression Run | `progression/index.html` | start-set chooser (not started) or summary, stage panel + actions, booster list, completed stages |
| Current Stage Pull | `progression/stage.html` | box opener, current pack strip, always-visible "Pulled this box" list |
| Booster Pull | `progression/boosters.html` | loose boosters with amounts, open loose pack, its pulled list |

All three: `areas.js` lists them under Run; profiles without run rules see the "No run rules" panel; a profile with no active profile is redirected by the existing guard.

## Pure rules (`progression-state.js`)

```text
newRun(list, startSet?)               -> run   // current = startSet (default first); startSet recorded
startIndex(run, list)                 -> integer
stageState(run, name, list)           -> "opened" | "next" | "locked" | "skipped"
reachedBoosters(run, list)            -> [name]   // skipped + completed + current
runSummary(run, list)                 -> string   // "Stage n/(total - startIndex) – …"
```

## Views (`progression/views/`) — DOM only

- `buildBoosterTile(name, { state, amount, selectable, selected, onSelect })`: picture (or named placeholder), caption name, state class (`pack-opened` / `pack-next` / `pack-locked` / `pack-skipped`), an optional `×amount` badge, and, when `selectable`, a button with `aria-pressed`.
- `renderHome(model, handlers)`: model = `{ run | null, profileName, ownedCards, boosters: [{name, state}], completed }`, handlers = `{ onChooseStart(name), onStartBox(), onCompleteStage() }`.
- `renderStage(model, handlers)`: model = `{ run, packOpen, boxFinished, pulledCards }`; returns the element refs the behaviour mounts the pack into (pack area, action slot, strip, pulled list).
- `renderPulledList(listEl, cards)`: redraws only the list from `cards` (rarest first, grouped); safe to call after each reveal.
- `renderBoosterPull(model, handlers)`: model = `{ boosters: [{name, amount}], openPack | null, busy }`, handlers = `{ onOpenOne(name) }`.

## Behaviour hooks

- `progression-context.js`: `activeProfile`, `currentRun`, `persistRun(run)`, `setProgressionStatus(text, isError)`, `renderNoRules()`, `pullContextFor(card)` (existing), `countOwnedCards()`.
- Screen 1: choose → confirm → `saveRun(newRun(list, name))`; Start box → `startNewPack` then `location = stage.html`; Complete stage → duel choice as today.
- Screen 2: mounts `createPackReveal` for `box.pack`; each `onReveal` persists then calls `renderPulledList`; "Next pack" as today; finished state links to screen 1.
- Screen 3: lists `packInventory` > 0; Open one generates first, then `startExtraPack`; mounts the loose pack with the same reveal; finishing saves to the Backlog and redraws the list.

## Navigation

- Sidebar: Progression Run → Current Stage Pull → Booster Pull.
- Screen 1 links to screens 2 and 3; screen 2 and 3 link back to screen 1; empty states link to the Store or screen 1 as the spec says.
