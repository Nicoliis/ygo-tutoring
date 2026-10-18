# Contract: Synergy & Count Additions

Internal client-side contracts. No endpoints are added.

## `shared/backlog-synergy.js` (new, pure, no DOM)

| Function | Behavior |
|----------|----------|
| `cardEffectText(card)` | `effect`, `desc`, `pendDesc`, `monsterDesc` joined; empty string when none |
| `quotedNames(text)` | Array of trimmed, whitespace-collapsed names found between straight or curly double quotes (1–80 chars), in order, duplicates removed case-insensitively |
| `synergyKey(name)` | Lower-case, trimmed, whitespace-collapsed form used for comparisons and storage |
| `buildSynergyIndex(cards)` | `{ entries: [{ key, label, count }] sorted by count desc then label, tied: (card, key) => boolean }`; each card counts once per key; a key is listed only when a card with an effect quotes it; `tied` counts a card whose own name contains the key only when such a card exists |
| `isVanillaFusion(card)` | True for a Fusion Monster that is not also an Effect Monster: type has no "effect" and the full text is a single line (materials only); such cards quote no synergy names |
| `hasNoEffect(card)` | True for Normal monsters (without a Pendulum effect) and for Fusion Monsters that are not also Effect Monsters; they quote no names |
| `cardTiedTo(card, key)` | Without an index: true when the card quotes the key (never its own full name) or its name contains the key |

## `shared/backlog-filter.js` changes

| Function | Change |
|----------|--------|
| `emptyFilter()` | `{ types: [], values: {}, synergy: [] }` |
| `isFilterActive(filter)` | True when any type ticked or any synergy selected |
| `activeFilterCount(filter)` | Renamed from `activeTypeCount`: ticked types plus 1 when a synergy selection exists (badge number) |
| `matchesFilter(card, filter, synergyIndex?)` | Type rule (only when types ticked) AND synergy rule (only when synergy selected) |
| `sanitizeFilter(raw)` | Keeps `synergy` as a unique array of non-empty strings ≤ 80 chars; older records load with `[]` |
| `saveBacklogFilter(filter)` | Clears the key when neither types nor synergy are active |
| `valueCounts(cards, groupId)` | `{ [valueGroup]: { [value]: number } }` for list groups of that tab, plus `{ "monster-normal": n, "monster-effect": n }` for `monster` |

All functions tolerate cards with missing fields.

## `shared/backlog-filter-modal.js` changes

| Behavior | Rule |
|----------|------|
| Value chips | Text and accessible name read `<value> (<count>)` |
| Monster include boxes | `Include normal (n)` / `Include effect (n)` |
| Synergy tab | Tenth tab "Synergy (<names>)" with a search box and a checkbox list `<label> (<count>)`, highest counts first; keyboard-reachable like the other tabs; selecting a name edits `draft.synergy` only |
| Apply / Cancel / Clear | Same semantics as before; Clear removes the whole stored record, synergy included |
| Stale selection | A selected key no card mentions any more is still listed (count 0) so it can be unticked |
| Background completion | Also triggers for cards without effect text; on completion the index, counts and list are rebuilt |

## `collection/collection-backfill.js` change

`completeMissingCardDetails` treats a card as incomplete when it lacks `race` or lacks any effect text (and has no `detailsTried`); batching and once-per-card behavior are unchanged.

## `shared/backlog-panel.js` / `collection/collection-render-backlog.js`

The icon state and badge read `isFilterActive` / `activeFilterCount`; the "No cards match your filter" message appears for synergy-only filters too.
