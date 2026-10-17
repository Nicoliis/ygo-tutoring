# Phase 1 Data Model: Backlog Card Tags & Type Filter

One new per-profile key; everything else reuses existing card fields.

## Storage key

| Key | Owner | Content |
|-----|-------|---------|
| `ygoBacklogFilter` (legacy name for Sandbox) / `ygoBacklogFilter_<profileId>` | backlog-filter.js | The applied filter (below); absent = no filter |

## Applied filter

```
{
  types:  [GroupId],                    // ticked tabs
  values: { [GroupId]: { [ValueGroup]: [string | number] } }   // selected values per tab
}
```

| Field | Rule |
|-------|------|
| `types` | Subset of `monster, spell, trap, ritual, fusion, synchro, xyz, pendulum, link`; empty = no type restriction |
| `values[group][valueGroup]` | Selected values; empty or missing = no restriction for that value group. Only meaningful for ticked groups |

Unknown fields are preserved on write. A malformed or missing record reads as "no filter".

### GroupId (the nine tabs)

`monster` ("Monster (normal/effect)"), `spell`, `trap`, `ritual`, `fusion`, `synchro`, `xyz`, `pendulum`, `link`.

### Value groups per tab

| Tab | Value groups |
|-----|--------------|
| monster, ritual, fusion, synchro | `attribute`, `race`, `level` |
| xyz | `attribute`, `race`, `rank` (the card's stored `level`) |
| pendulum | `attribute`, `race`, `level`, `scale` |
| link | `attribute`, `race`, `linkval` (link rating) |
| spell, trap | `subtype` (the card's stored `race`) |

## Card fields read (all optional)

`type`, `frameType`, `attribute`, `race`, `level`, `scale`, `linkval`; and a new optional marker `detailsTried: true` set by the background completion on every card it has attempted (found or not) so a card is requested at most once. Missing values never throw; a card missing a value that a selected group needs does not match.

## Classification (derived, never stored)

First match wins on `type` (text) with `frameType` as fallback: pendulum → link → xyz → synchro → fusion → ritual → spell → trap → monster; no recognizable type = unclassified (listed only while no type is ticked).

## State transitions

```
draft (in the window) --[Apply]--> applied filter saved for the profile, Backlog re-rendered
draft                 --[Cancel / Escape / backdrop]--> discarded
saved filter          --[Clear]--> removed; full Backlog
window opened         --> cards missing race are completed in batches; values and list refresh
```

## Entities mapped to spec

- **Card type group** → GroupId and the classification rule.
- **Type filter** → Applied filter.
- **Filter value** → entries inside `values`, built from the user's cards.
- **Backlog card tag** → presentation only (205 px, one-click details).
