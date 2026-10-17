# Contract: Profiles & Run Module Interfaces

Internal (client-side) contracts between shared modules and tools. No network endpoints are added.

## `shared/profiles.js` (global functions, loaded after `save-utils.js`)

| Function | Behavior |
|----------|----------|
| `listProfiles()` | Returns profiles array (runs one-time Sandbox migration if needed). |
| `getActiveProfile()` | Returns the active profile or `null`. |
| `createProfile(name, mode)` | Validates (non-empty, unique, mode allowed); creates profile, initializes mode state, sets it active; returns profile or throws `Error` with a user-readable message. |
| `renameProfile(id, name)` | Same name validation. |
| `deleteProfile(id)` | Removes registry entry and that profile's `ygo*_<id>` keys (never legacy keys for Sandbox unless the user confirmed deleting Sandbox). Caller must have confirmed. |
| `setActiveProfile(id)` | Persists `activeId`. |
| `profileKey(baseKey)` | `baseKey` for Sandbox, `baseKey + "_" + id` otherwise. Throws if no active profile. |

Invariant: every function persists exclusively through `saveData`/`loadData`; keys always start with `ygo`.

## Tool pages

- Each tool's `STORAGE_KEY` becomes `profileKey("ygoCollection")` / `profileKey("ygoDeck")`; nothing else about their load/save logic changes.
- `profile-switcher.js` MUST redirect to the root `index.html` when `getActiveProfile()` is `null`.

## `progression/progression-state.js` (pure logic)

| Function | Behavior |
|----------|----------|
| `loadRun(profileId)` / `saveRun(profileId, run)` | Via `loadData`/`saveData` on `ygoRun_<id>`. |
| `newRun(boosterList)` | Returns initial run state per data-model. |
| `canOpenBox(run)` / `canCompleteStage(run)` | Boolean + reason string for blocked cases (surfaced in the UI per SC-005). |
| `openBoxApplied(run)` | Returns run with `boxOpened = true`. |
| `completeStage(run, boosterList)` | Returns next run state; never mutates completed history. |

## `progression/progression-box.js`

`openBox(setName)` → Promise resolving to the list of pulled cards (24 packs × `getBoosterSize(setName)`), rejecting without side effects if the card pool cannot be fetched. Caller merges into backlog and only then marks the box opened.

## Backward-compat rules
- Legacy `ygoCollection`/`ygoDeck` remain the Sandbox profile's storage forever.
- Unknown fields in registry, profile, or run records MUST be preserved on write (already guaranteed by `saveData` for top-level fields; code must spread existing records when updating).
