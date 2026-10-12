# Phase 0 Research: Booster Draft

The `/speckit-clarify` pass already resolved the spec's three highest-impact ambiguities (Master
Duel rarity descoped, per-booster card count varies by set, missing price sorts lowest). This
document records the remaining *technical approach* decisions made during planning, each
grounded in how the existing codebase already solves an adjacent problem.

## Decision 1: Reuse the Progression Series Pack Puller's fetch/cache/weighted-draw approach

**Decision**: `draft.js` implements its own copies of the same three primitives
`tracker.js` already uses for its set pack simulator (see `specs/003-ygo-set-pack-simulator/
research.md`): (1) a once-per-session cached fetch of `GET cardsets.php` for the set-picker
autocomplete, (2) a once-per-distinct-set cached fetch of `GET cardinfo.php?cardset=<name>` for
that set's card pool, and (3) `getWeightForRarity`-style rarity-weighted random draws, reading each
card's rarity from the `card_sets` entry matching the *selected* set (never just the first entry),
with missing rarity falling back to the lowest (Common) weight tier.

**Rationale**: This is the exact same problem (simulate opening boosters from a user-chosen real
set) already solved, reviewed, and running in production inside this app. Reusing the identical
approach avoids re-deriving a second, possibly-inconsistent simulation model, and keeps network
behavior consistent with Constitution Principle II. Each page in this app already maintains its
own independent copy of near-identical helpers (e.g. `extractCardDataFromApiResult` exists almost
identically in both `collection.js` and `tracker.js`) rather than sharing a library module, so
giving `draft.js` its own copy follows established precedent rather than introducing a new sharing
mechanism.

**Alternatives considered**:
- *Extract the shared logic into a new shared module (e.g. `pack-sim.js`) used by both `tracker.js`
  and `draft.js`*: would reduce duplication, but no such shared-module pattern exists anywhere in
  this project today (`nav.js` is the only shared script, and it owns no card-data logic); doing so
  now would be a cross-cutting refactor of an unrelated, already-shipped feature, disproportionate
  to this feature's scope. Rejected in favor of the established per-page-copy convention.
- *Build a different/simpler draw model specific to drafting*: rejected — there is no reason a
  "booster" opened for a draft should have different odds than the same booster opened for the
  pack tracker; consistency matters more here than for most features, since both features draw
  from the same real-world sets.

## Decision 2: Per-set booster size via a small local override table, defaulting to 9

**Decision**: Introduce `DEFAULT_BOOSTER_SIZE = 9` and a small local
`BOOSTER_SIZE_OVERRIDES` lookup (an object keyed by exact set name) in `draft.js`. A
`getBoosterSize(setName)` helper returns the override for that set name if one is registered,
otherwise the default. The override table starts empty and is intended to be extended over time as
specific non-standard-size sets are identified; this requires no schema or build-step change —
just adding an entry to a plain object literal.

**Rationale**: The `/speckit-clarify` session confirmed booster size must vary per selected
set rather than being a universal constant, but the YGOPRODeck API's `cardsets.php` response
field (`num_of_cards`) describes a set's *total distinct card count*, not its *physical pack
size* — there is no public API field for "cards per booster pack." A small, explicit local
override table is the simplest mechanism that (a) is correct by default for the overwhelming
majority of real TCG booster sets (9 cards/pack is the long-standing TCG standard), (b) lets a
maintainer correct specific known exceptions without touching any other logic, and (c) introduces
no new dependency, network call, or build step — consistent with Constitution Principle III.
**Note for implementation**: no specific exception sets are hardcoded by this plan, since doing so
without a verified source could silently mis-simulate the very sets it's meant to fix; populating
the table is a maintenance task deferred to whoever has verified data for a specific set.

**Alternatives considered**:
- *Always use the fixed constant `9`, matching `tracker.js`'s current behavior exactly*: simpler,
  but directly contradicts the clarified requirement that booster size must be read per selected
  set rather than assumed constant; rejected.
- *Ask the user to manually enter the booster size as a form field*: shifts a data-accuracy problem
  onto the user for every single draft, adding friction to the primary (I. Usability First) flow
  for a value that is usually self-evident from the set; rejected in favor of a sensible default
  that is correct without any extra input in the common case.
- *Derive it from `num_of_cards`*: mathematically unrelated to pack size (e.g., a 100-card set is
  not a "100-card booster"); rejected as factually wrong.

## Decision 3: Approximate price sourced from `card_prices`, missing values treated as `0`

**Decision**: When the price grouping criterion is selected, each pool card's approximate price is
read from the API response's `card_prices[0].tcgplayer_price` field (parsed as a number). If the
field is absent, non-numeric, or the `card_prices` array itself is empty, the card's price is
treated as `0` for sorting purposes — i.e., the lowest possible value, so it sorts alongside
cheap/common cards per the `/speckit-clarify` decision.

**Rationale**: `tcgplayer_price` is the first/primary price field YGOPRODeck's `cardinfo.php`
response provides per card and is the conventional "market price" figure for this API; no other
page in this codebase currently reads any `card_prices` field, so this is a net-new, additive
extraction with no risk of conflicting with existing logic. Treating missing data as `0` is a
direct, literal implementation of the clarified rule and requires no additional branching beyond a
`Number(...) || 0`-style parse.

**Alternatives considered**: Other `card_prices` sub-fields (`cardmarket_price`, `ebay_price`, etc.)
were considered; `tcgplayer_price` was chosen as the single criterion (rather than averaging
several) to keep the "sort, form groups, shuffle" pipeline simple and because the spec itself
already acknowledges this category is approximate/imperfect — averaging multiple noisy sources
would add complexity without a meaningfully more accurate result.

## Decision 4: Sort/group/shuffle pipeline runs independently per opened booster

**Decision**: For each opened booster (not across the whole draft), `draft.js`: (1) sorts that
booster's drawn cards by the selected criterion's numeric value ascending (rarity weight or price;
direction only affects which specific cards land in which group, not group count, order of
*display* which is already randomized in the next step), (2) walks the sorted list in consecutive
chunks of `cardpool` size to form that booster's pick groups (final chunk may be short), swapping a
duplicate-named card forward from a later chunk when one is available to avoid two same-named
cards in one group (per FR-009), and (3) shuffles the resulting list of this booster's own pick
groups before they are queued for presentation.

**Rationale**: Directly implements FR-008 and the spec's Assumption that grouping never mixes
cards from two different opened boosters (confirmed by the spec's own worked example: a 9-card
booster with cardpool 3 yields exactly 3 kept cards "per booster"). Running the pipeline
per-booster rather than pooling the whole draft's cards keeps the "N boosters → N× this many kept
cards" guarantee (SC-002) trivially true by construction.

**Alternatives considered**: Pooling all `amount × boosterSize` cards from the whole draft before
sorting/grouping was rejected — it would make the kept/total ratio-per-booster guarantee incidental
rather than structural, and would let an unlucky early booster "steal" the easy groups from a later
one, which is not what the user's worked example describes.
