# Phase 0 Research: Game Profiles & Progression Mode

## Decision 1: How to isolate data per profile
- **Decision**: Resolve each storage key per profile via `profileKey(baseKey)`. Non-legacy profiles use `<baseKey>_<profileId>` (e.g. `ygoCollection_p3f2a`); the Sandbox profile keeps the unsuffixed legacy keys.
- **Rationale**: Existing tools only define `STORAGE_KEY` once each, so isolating data is a one-line change per tool. Keeping legacy keys for Sandbox means migration is zero-copy and zero-risk (SC-006). All keys still start with `ygo`, so `exportAll` from `save-utils.js` captures every profile with no change.
- **Alternatives**: (a) One big blob holding all profiles — rewrites every tool's load/save and risks data loss on any bug. (b) Copy legacy data into a new key on migration — doubles data and leaves a stale original.

## Decision 2: Where the profile registry and run state live
- **Decision**: Registry in key `ygoProfiles` (`{ activeId, profiles: [...] }`). Run state in `ygoRun_<profileId>` (own key, not inside the collection blob).
- **Rationale**: The collection blob is rewritten whole by several tools; keeping run state separate prevents accidental overwrite. `saveData` already preserves unknown top-level fields, adding safety.
- **Alternatives**: Run state inside the profile record — grows the registry on every pack-open event and couples unrelated writes.

## Decision 3: Entering the app / profile guard
- **Decision**: `index.html` is the profile picker. Tool pages include `profile-switcher.js`, which redirects to `index.html` when there is no active profile and renders the current profile + "Switch" link in the sidebar.
- **Rationale**: Satisfies FR-001/FR-005 with one shared script and no routing framework.
- **Alternatives**: Modal on every page — duplicates UI and fails keyboard/focus handling per page.

## Decision 4: Stage order and release dates
- **Decision**: Stage order = order of `MAINLINE_BOOSTERS` in `draft/mainline-boosters.js` (already hand-maintained chronologically). Release dates come from one cached `cardsets.php` call (`tcg_date`) used for display only.
- **Rationale**: Honors the spec assumption without re-sorting; display date never affects order, so a missing date is harmless. One call, cached, respects Principle II.
- **Alternatives**: Sort by API date — extra edge cases (same-day sets, missing dates) and could reorder completed stages.

## Decision 5: Stage identity when the booster list changes
- **Decision**: Run state stores stages by booster **name** (completed set + current name + `boxOpened` flag), not by list index.
- **Rationale**: Adding a booster to the list never shifts completed history (spec edge case). The next stage is "first list entry after the current one".
- **Alternatives**: Index storage — breaks when entries are inserted.

## Decision 6: Opening a box
- **Decision**: A box = 24 packs generated with the draft's existing card-pool fetch, weighted rarity pick and `getBoosterSize` per-set size; all cards are merged into the profile backlog with the same merge logic as the draft (`addKeptCardsToBacklog`, made profile-key aware via `STORAGE_KEY`). `boxOpened` is set only after the merge is saved.
- **Rationale**: Reuses proven logic (spec: reuse existing features). Setting the flag last guarantees an offline/failed fetch never marks the box as opened.
- **Alternatives**: New pack engine — duplicates rarity logic.

## Decision 7: Game modes as data
- **Decision**: Profile has `mode` string (`"progression"` | `"sandbox"`). Each mode owns a folder/module; the picker lists modes from a small constant table.
- **Rationale**: Meets FR-017 without a plugin framework (Principle III).
- **Alternatives**: Registry/plugin API — speculative generalization.

## Decision 8: Irreversibility
- **Decision**: "Open box" and "Complete stage" each show a confirm dialog (existing `shared/modal.js`); no undo path is implemented (FR-009b). Profile delete confirms too.
- **Rationale**: Constitution I requires confirmation for destructive actions.
