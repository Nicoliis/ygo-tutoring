# Data Model: Filter Counts & Synergy Tab

## Filter record (stored per profile under `ygoBacklogFilter`)

| Field | Type | Notes |
|-------|------|-------|
| `types` | `[includeId]` | Unchanged from feature 012 |
| `values` | `{ [tabId]: { [valueGroup]: [value] \| {min,max} } }` | Unchanged |
| `synergy` | `[string]` | NEW. Lower-case synergy keys the user selected. Absent or empty = no synergy restriction. Sanitized: strings only, trimmed, non-empty, unique, each at most 80 characters |

Unknown fields already stored are preserved (existing `saveData` merge behavior). An older record without `synergy` loads with an empty list.

## Synergy name (derived, never stored)

| Field | Meaning |
|-------|---------|
| `key` | Lower-case, whitespace-collapsed text between double quotes |
| `label` | First-seen spelling, shown in the tab |
| `count` | Number of distinct Backlog cards tied to the key |

Built from `collection.cards` each time the window opens and after background completion.

## Card tie (derived)

A card is tied to `key` when: its quoted-name set (from `effect`/`desc`/`pendDesc`/`monsterDesc`) contains `key`, or its lower-case `name` contains `key`.

## Value count (derived)

`counts[tabId][valueGroup][value]` = number of distinct cards of that tab with that value. Monster tab also exposes `counts.monster["monster-normal"]` and `["monster-effect"]`.

## Matching rule

`matchesFilter(card, filter)` = `typeRule(card, filter)` AND (`synergy` empty OR card tied to any selected key). Active when `types` non-empty or `synergy` non-empty. Badge number (`activeFilterCount`) = ticked types + 1 if `synergy` is non-empty.
