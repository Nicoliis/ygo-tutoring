# Phase 0 Research: YGO Set Pack Simulator

No item in the plan's Technical Context carries a `NEEDS CLARIFICATION` marker. This document
records the technical decisions made and why.

## Decision: Reuse the same card database `app.js` already calls

- **Decision**: Call `https://db.ygoprodeck.com/api/v7/` — the exact same API host `app.js`
  already uses for card search (`API_URL` in `app.js`) — rather than a different card-data
  source.
- **Rationale**: Spec Assumption: "the YGO api" means the same external database already used
  elsewhere in this app. Introducing a second card-data provider would be unjustified complexity
  (Constitution III) and would risk inconsistent card names/data between the proxy builder and
  this feature.
- **Alternatives considered**: A different/offline card database was rejected — this app has no
  bundled card data at all today, and bundling one (thousands of cards, updated over time) is far
  more complex than reusing the live API already in use.

## Decision: Two call shapes — full set list, and one set's card pool — both cached per session

- **Decision**:
  1. `GET /api/v7/cardsets.php` — returns every real card set, each with (at least) a name and a
     `tcg_date` release date. Fetched **once per page session**, cached in memory, and reused for
     every subsequent search/sort/filter in the set picker — none of which make further network
     calls, since filtering happens entirely against the already-fetched list.
  2. `GET /api/v7/cardinfo.php?cardset=<set name>` — returns every card belonging to that one
     set. Fetched **once per distinct set per session**, cached in a map keyed by set name, and
     reused for every subsequent simulated pull from that same set (FR-007).
- **Rationale**: Both are bounded, one-shot, user-initiated fetches — exactly the shape
  Constitution Principle II calls for (no polling, no per-keystroke calls, no speculative
  prefetching). Caching in memory (not `localStorage`) is sufficient since the data is read-only
  reference data for the current session; nothing about it needs to persist across reloads, and
  not persisting it avoids `localStorage` bloat from potentially thousands of set entries.
- **Alternatives considered**: Fetching a set's cards lazily per pack (re-fetching on every
  simulated pull) was rejected — it would violate FR-007 and multiply network traffic for no
  benefit, since a set's card pool doesn't change within a session. Persisting the fetched data
  in `localStorage` was considered for cross-session reuse, but rejected for this iteration to
  keep the shared blob free of large, easily-re-fetchable reference data (see data-model.md).

## Decision: Rarity-weighted random draw, not exact slot-structure simulation

- **Decision**: Each card in a fetched set's pool is assigned a weight from a small fixed table
  based on its `set_rarity` for *that* set (commons weighted far higher than rare-tier
  rarities); a simulated pull of N packs draws `N × 9` cards (with replacement) from the pool
  using those weights.
- **Rationale**: Spec FR-004 asks for an approximation ("commons substantially more likely"),
  explicitly not official print-run accuracy (Assumptions). A full slot model (e.g. "pack = 7
  commons + 2 guaranteed rare-or-higher slots with per-rarity-tier odds") would require print-run
  odds data that isn't publicly standardized across 20+ years of sets, and would be substantially
  more complex to build and reason about for a feature explicitly scoped as approximate
  (Constitution III).
- **Alternatives considered**: Uniform random selection (every card equally likely) was rejected
  outright — it directly contradicts FR-004. An exact per-set slot model was rejected as
  disproportionate complexity for data that isn't reliably available anyway.

## Decision: A card's rarity is read from its matching `card_sets` entry, not assumed

- **Decision**: `cardinfo.php?cardset=X` returns each card with a `card_sets` array that can
  contain multiple entries (one per set/reprint that card has ever appeared in). The weighting
  step MUST use the entry whose `set_name` exactly matches the selected set — never just the
  first entry in the array — since a card reprinted in a later set often carries a different
  rarity there than in the set the user actually selected.
- **Rationale**: Using the wrong entry would silently misrepresent that specific set's real
  rarity distribution, undermining the one piece of realism (FR-004, SC-002) this feature exists
  to provide.
- **Alternatives considered**: Using the first `card_sets` entry unconditionally was considered
  (simpler) but rejected as a correctness bug waiting to happen for any reprinted card.

## Decision: Missing rarity data falls back to the lowest (Common) weight tier

- **Decision**: If a card's matching `card_sets` entry has no usable `set_rarity` value, it is
  weighted as if it were Common.
- **Rationale**: Directly answers the spec's edge case ("card missing rarity information").
  Common is the safest, least-distorting default — it avoids accidentally over-weighting an
  unknown card as if it were rare, which would skew results further from the "approximate real
  odds" goal than treating it as ordinary.
- **Alternatives considered**: Excluding such cards from the pool entirely was rejected — it
  would make some real, legitimately-owned cards impossible to pull, which is worse than a minor
  weighting inaccuracy.

## Decision: Fetch failures are caught before any pull is logged, never partway through

- **Decision**: Both fetches (and the draw computation) complete fully, in memory, before
  `tracker.js`'s existing pull-logging path is ever invoked. On any fetch failure, a clear error
  is shown and nothing downstream runs.
- **Rationale**: This satisfies FR-008/US3 "no partial result" by construction rather than by
  needing explicit rollback logic — there is nothing to roll back, since the backlog/tracker are
  never touched until a complete, successful draw exists. Matches the existing `app.js` error
  pattern (`if (!res.ok) { ...show a message... }`) already established in this codebase.
- **Alternatives considered**: Logging cards incrementally as they're "drawn" (streaming) was
  rejected — it's unnecessary for data this small and would reintroduce exactly the partial-write
  risk this decision avoids.
