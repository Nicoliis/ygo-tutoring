# Data Model: Progression Screens and Starting Set

## Saved run (`ygoRun_<profileId>`) — one new optional field

```text
{
  completed: [setName],
  current: setName | null,
  startSet?: setName,        // NEW: the set the run began at; absent in runs saved before this feature (= first set)
  boxOpened, box: { packsOpened, pack, pulled }, extraPack, packInventory, balanceCents, boosterBuys, ...
}
```

- No record at all = the run is **not started** (screen 1 shows the chooser).
- `startSet` is written once, by `newRun(boosterList, startSet)`, and never changed.

## Derived values (pure, in `progression-state.js`)

- `startIndex(run, list)` = `list.indexOf(run.startSet)`, or 0 when absent or unknown.
- `stageState(run, name, list)`: `"opened" | "next" | "locked" | "skipped"`; `"skipped"` for names before `startIndex`.
- `reachedBoosters(run, list)` = skipped sets + completed + current (list order), so the Store sells earlier sets.
- `runSummary(run, list)` = `Stage n/total – Box …` with `total = list.length − startIndex` and `n = completed.length + 1`; "Finished" when `current` is null.
- `remainingStages(run, list)` = unchanged (stages after the current).
- Pulled list for a pack or box: `groupPulled(cards)` → `[{ card, count }]` ordered by `rarityRank` descending, then name.

## Constants

None new for the rules. UI constants (named, at the top of their files): `PULLED_LIST_EMPTY_TEXT`, `BOOSTER_TILE_WIDTH_PX` live with the views/CSS.

## Validation rules

- `startSet` must be a name in the booster list; an unknown name is treated as absent.
- A started run's `current` is never before its start set.
- `packInventory[name]` entries with amount 0 or less are never listed.
- Pulled cards are listed exactly as saved in `box.pulled` (or the open loose pack's revealed cards); nothing is duplicated by the list.
