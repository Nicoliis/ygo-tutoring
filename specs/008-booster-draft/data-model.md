# Phase 1 Data Model: Booster Draft

No new server-side data and no new persisted `localStorage` key beyond the existing backlog
(`ygoCollection`, see Decision below). Everything else here is in-memory, session-scoped state
inside `draft.js`.

## Booster Draft Session

The single, in-memory state object for the current draft (one at a time — starting a new draft
replaces it entirely per FR-018).

| Field              | Type                        | Description                                                                 |
|--------------------|------------------------------|-------------------------------------------------------------------------------|
| `setName`           | string                       | The selected booster/set name (from the autocomplete), fixed once a draft starts (FR-017) |
| `boosterSize`       | integer                      | Cards per booster for `setName`, resolved via `getBoosterSize(setName)` (research.md Decision 2), fixed once a draft starts |
| `amount`            | integer ≥ 1                  | Number of boosters to open (FR-003), fixed once a draft starts                |
| `cardpool`          | integer, `1 ≤ cardpool ≤ boosterSize` | Pick-group size (FR-004), fixed once a draft starts                 |
| `grouping`          | `"rarity"` \| `"price"`      | Selected grouping criterion (FR-005), fixed once a draft starts               |
| `status`            | `"configuring"` \| `"in-progress"` \| `"finished"` | Current session phase                                    |
| `pickQueue`         | array of Pick Group          | Remaining pick groups across all opened boosters, in presentation order       |
| `keptCards`         | array of Kept Card           | Cards chosen so far, in pick order (display sorts this alphabetically — see contracts) |

**Validation rules** (enforced before `status` may move from `configuring` to `in-progress`,
per FR-016):
- `amount` MUST be an integer ≥ 1 (FR-003).
- `cardpool` MUST be an integer with `1 ≤ cardpool ≤ boosterSize` (FR-004).
- `setName` MUST be a non-empty string matching a real set the autocomplete resolved (FR-002).

**State transitions**:

```
configuring --[Start Draft, all validations pass]--> in-progress
in-progress --[pick made, pickQueue still has entries]--> in-progress
in-progress --[pick made, pickQueue now empty]--> finished
finished    --[Add to Backlog]--> (session cleared; tab returns to a fresh "configuring" state, FR-018)
configuring/in-progress --[Cancel/abandon, confirmed]--> (session cleared; back to fresh "configuring" state)
```

No transition skips a step; `in-progress` cannot be re-entered once `finished` without configuring
a brand-new session.

## Pick Group

One screenful of simultaneously-shown cards, drawn from a single opened booster.

| Field        | Type                  | Description                                                                 |
|--------------|------------------------|-------------------------------------------------------------------------------|
| `boosterIndex` | integer (0-based)    | Which opened booster (of `amount`) this group's cards came from — informational only, never shown to the user, used only to guarantee groups never mix cards across boosters |
| `cards`      | array of Pool Card (length `1..cardpool`) | The cards shown for this pick; length is less than `cardpool` only for a booster's final, short group |

**Validation rule**: `cards` MUST NOT contain two entries with the same `name` unless every other
card available in that booster's own draw already appears somewhere else in that same group's
formation window (FR-009) — i.e., duplicates are avoided whenever a distinct alternative exists
within that booster's own cards.

## Pool Card (drawn card, pre-pick)

A single card as drawn from the weighted pool for one booster opening — the shape already
established by `tracker.js`'s `extractCardDataFromApiResult` plus the two new fields this feature
adds.

| Field       | Type            | Description                                                                |
|-------------|------------------|-------------------------------------------------------------------------------|
| `name`      | string           | Card name, as returned by the API                                            |
| `weight`    | number           | Rarity-based draw weight (existing `getWeightForRarity` scale)                |
| `apiId`, `type`, `imageSmall`, `imageFull`, `level`, `atk`, `def` | existing types | Unchanged from `tracker.js`'s established shape |
| `sortValue` | number           | **New.** The numeric value used for this draft's sort/group step: `weight` when `grouping = "rarity"`, or the parsed `tcgplayer_price` (0 if missing/unparseable, per research.md Decision 3) when `grouping = "price"` |

## Kept Card

A card the user picked from a Pick Group; contributes to the final draft result and, once the
draft finishes, to the backlog merge.

| Field  | Type   | Description                                      |
|--------|--------|---------------------------------------------------|
| `name` | string | Card name — the only field the backlog merge needs, matching the name-based merge key `collection.js`'s `addOrIncrementCardFromSearchResult` already uses |
| (other Pool Card fields) | existing types | Carried through so the backlog entry can be enriched (`type`, `imageSmall`, etc.) the same way `addOrIncrementCardFromSearchResult` additively fills in missing fields on an existing backlog entry |

## Backlog integration (existing entity, not redefined here)

**Decision**: `draft.js` does not introduce a new persisted entity. "Adding to the backlog"
(FR-015) reads and writes the existing `ygoCollection` `localStorage` key directly, using the same
`OwnedCard` shape and merge-by-name rule already defined in `specs/001-draft-collection-manager/
data-model.md` and implemented by `collection.js`'s `addOrIncrementCardFromSearchResult`. Because
`draft.html` is a separate page/document from `collection.html`, `draft.js` cannot call that
function directly — it implements its own small, equivalent merge-by-name loop over `keptCards`
against the same `localStorage` key, following the same additive-fill-in rule (never overwrite a
field the existing backlog entry already has), consistent with how `tracker.js` and `collection.js`
already each maintain independent copies of similar per-page helpers (research.md Decision 1).
