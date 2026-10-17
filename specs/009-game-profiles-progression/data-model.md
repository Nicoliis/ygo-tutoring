# Phase 1 Data Model: Game Profiles & Progression Mode

All keys start with `ygo` (required by `shared/save-utils.js` so export/import cover them).

## Storage keys

| Key | Owner | Content |
|-----|-------|---------|
| `ygoProfiles` | profiles.js | Registry (below) |
| `ygoCollection`, `ygoDeck` | Sandbox profile | Legacy keys, untouched (collection/backlog/decks, proxy deck) |
| `ygoCollection_<id>`, `ygoDeck_<id>` | other profiles | Same shape as legacy keys, one pair per profile |
| `ygoRun_<id>` | progression | Progression run state for that profile |
| `ygoSidebarCollapsed` | nav | Unchanged, global (not per profile) |
| `ygoSetDates` | progression | Global (not per profile) cache of booster name → release date from `cardsets.php`; display only |

## Registry (`ygoProfiles`)

```
{
  activeId: string | null,
  profiles: [Profile]
}
```

### Profile

| Field | Type | Rule |
|-------|------|------|
| `id` | string | Unique, immutable, generated at creation as `"p"` + 8 random lowercase alphanumeric characters (safe inside storage keys); `"sandbox"` is reserved for the migrated profile |
| `name` | string | Non-empty, unique case-insensitive, trimmed |
| `mode` | `"progression"` \| `"sandbox"` | New profiles may only choose `"progression"` for now |
| `createdAt` | ISO string | Set once |

**Migration (first load with no `ygoProfiles`)**: if legacy `ygoCollection` or `ygoDeck` exists, create profile `{ id: "sandbox", name: "Sandbox", mode: "sandbox" }` and make it active-able. If no legacy data exists, create no profile (picker asks the user to create one). Migration never writes to or deletes legacy keys.

## Run state (`ygoRun_<id>`, progression only)

| Field | Type | Description |
|-------|------|-------------|
| `completed` | string[] | Booster names completed, in completion order |
| `current` | string \| null | Booster name of the current stage; `null` = finished |
| `boxOpened` | boolean | Whether the current stage's box has been opened |
| `startedAt` | ISO string | Run start |
| `finishedAt` | ISO string \| null | Set when the last stage completes |

### Derived (never stored)
- Remaining stages: `MAINLINE_BOOSTERS` entries after `current` (and not in `completed`).
- Release dates: looked up from cached `cardsets.php` data by name; may be absent.

### State transitions

```
new run:       current = MAINLINE_BOOSTERS[0], boxOpened = false, completed = []
openBox:       allowed only if current != null and !boxOpened -> boxOpened = true (after backlog saved)
completeStage: allowed only if boxOpened -> completed += current; current = next entry in list or null; boxOpened = false; if null set finishedAt
```
No transition goes backward (FR-009b). If a new booster is appended to the list after the run finished, `current` stays `null`: a finished run stays finished (clarified 2026-10-16). An in-progress run simply finds the new entry among its remaining stages.

## Entities mapped to spec

- **Profile / Game Mode** → Profile record + `mode`.
- **Run / Stage** → Run state + booster names from `MAINLINE_BOOSTERS`.
- **Backlog / Deck** → existing `ygoCollection[_id]` blob (`cards`, `decks`, `engines`, `trackers`), unchanged shape.
