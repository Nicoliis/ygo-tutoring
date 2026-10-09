# Phase 1 Data Model: Progression Series Pack Puller

One new entity family (`Tracker`, holding `checklist` and `pulls`), persisted inside the same
shared `localStorage` blob `collection.js` already owns (see `research.md`). No entity has a
separate stored lifecycle/status field beyond what's listed; completion progress is computed at
read time from raw pull history, never stored.

## Tracker

Represents one Progression Series box the user is opening.

| Field | Type | Rules |
|---|---|---|
| `id` | string | Generated on creation. |
| `name` | string | Required, non-empty after trim. Maps to spec FR-001. |
| `checklist` | array of string | Each entry is a unique (case-insensitive), non-empty, trimmed card name. Optional — may be an empty array (FR-002: checklist is optional). |
| `pulls` | array of `{ id, cardNames: string[] }` | Each entry is one logged pack-opening event. `cardNames` is the non-empty lines the user entered for that pull, trimmed, blank lines dropped (FR-003). Maps to spec Edge Case "empty or whitespace-only card name" — such lines are silently skipped, not stored, not treated as an error. |

**Derived (not stored)**:
- `packsOpened` = `pulls.length` (FR-005).
- `collectedNames` = the set of every distinct (case-insensitive) name across all `pulls[].cardNames`.
- `checklistCollectedCount` = count of `checklist` entries whose name (case-insensitive) is in `collectedNames`.
- `outstandingChecklist` = the `checklist` entries whose name is **not** in `collectedNames` (FR-006).
- A `cardNames` entry that does not match any `checklist` entry still counts toward `packsOpened`
  and still updates the shared Backlog; it simply doesn't increase `checklistCollectedCount`
  (FR-007, spec Edge Case on unlisted pulls).

**Validation**:
- Creating/renaming a Tracker rejects an empty/whitespace-only `name`.
- Logging a pull rejects an attempt with **zero** non-blank lines (can't log an "empty pack");
  any mix of blank and non-blank lines is accepted, with blank lines simply dropped.
- Adding a checklist entry rejects an empty/whitespace-only name and silently no-ops if that name
  (case-insensitive) is already present in the tracker's checklist, mirroring the Backlog's own
  "merge rather than duplicate" rule for card names.

**Deletion**: Deleting a Tracker requires confirmation (Constitution Principle I) and removes
only that Tracker (its `checklist` and `pulls`). It does **not** touch the shared `cards` array —
backlog quantities already contributed by that tracker's past pulls are left exactly as they are
(FR-009, spec US3/AC3). This mirrors the Draft Collection Manager's own Deck deletion rule
("independence" — deleting the container never retroactively undoes what it already contributed
elsewhere).

**Editing**: Renaming a Tracker, or adding/removing checklist entries, affects only that Tracker.
Because checklist completion is always recomputed from `pulls` (not stored per-entry), editing
the checklist after pulls have already been logged is automatically reflected correctly on the
next render — there is nothing to "re-sync" (spec Edge Case on checklist edits after pulls).

## Interaction with the shared Backlog (`cards`)

Logging a pull with `cardNames = ["Pot of Greed", "Pot of Greed", "Raigeki"]` performs, for each
line, the exact same operation `collection.js`'s `addOrIncrementCard` already performs against
the shared `cards` array: trim the name, case-insensitively match an existing `OwnedCard` by
name, and increment its `quantityOwned` by 1 per occurrence (or create a new `OwnedCard` with
`quantityOwned: 1` if no match exists). Two occurrences of the same name in one pull increment
that card's owned quantity by 2. This is implemented locally in `tracker.js` (see research.md —
no shared runtime code between pages) but must produce byte-identical results to
`collection.js`'s own merge rule, since both pages read and write the same `cards` array.

## Top-level persisted shape (extended)

```json
{
  "cards": [ { "id": "...", "name": "...", "quantityOwned": 0 } ],
  "engines": [ { "id": "...", "name": "...", "cards": [ { "cardId": "...", "quantity": 1 } ] } ],
  "decks": [ { "id": "...", "name": "...", "items": [ { "type": "card", "cardId": "...", "quantity": 1 } ] } ],
  "trackers": [
    {
      "id": "...",
      "name": "...",
      "checklist": [ "Card Name A", "Card Name B" ],
      "pulls": [ { "id": "...", "cardNames": [ "Card Name A", "Card Name A" ] } ]
    }
  ]
}
```

`cards`, `engines`, and `decks` are exactly as defined in the Draft Collection Manager's
`data-model.md` — unchanged. `trackers` is the only addition, under the same `localStorage` key
(`ygoCollection`). `tracker.js` MUST load the full existing blob, add/update only the `trackers`
array (and, via the shared merge rule above, entries within `cards`), and write the whole blob
back — never overwriting `engines` or `decks` with an empty default, even though `tracker.js`
itself has no feature-level reason to read them.
