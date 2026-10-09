# Phase 0 Research: Booster Pull Review

No item in the plan's Technical Context carries a `NEEDS CLARIFICATION` marker (all were resolved
during `/speckit-specify` and `/speckit-clarify`). This document records the remaining technical
decisions and why.

## Decision: Extract richer per-card fields from the pool `fetchSetCardPool` already fetches

- **Decision**: `fetchSetCardPool`'s mapped pool entries grow from `{ name, weight }` to
  `{ name, weight, apiId, type, level, atk, def, imageSmall, imageFull }`, extracting the extra
  fields from the exact same `cardinfo.php?cardset=` response already being parsed (mirroring
  `collection.js`'s `extractCardDataFromApiResult` field rules: `level`/`atk`/`def` populated only
  for Monster-type cards).
- **Rationale**: The response already contains every field a minicard's detail view needs
  (`card_images`, `type`, `level`, `atk`, `def`) — today's code simply discards them after reading
  `name` and the matching set's rarity. Capturing them when the pool is built means a pending
  pull's minicards get real detail with **zero additional network calls**, satisfying FR-008 and
  Constitution Principle II as strongly as possible (not just debounced/cached — literally free).
- **Alternatives considered**: A separate per-card lookup when a minicard is clicked was rejected
  — it would add a new network call shape for data already in hand, the exact kind of redundant
  call Principle II exists to prevent.

## Decision: A pending pull is session-only state, keyed by tracker id, holding its own draw
parameters

- **Decision**: `const pendingPulls = new Map()` maps a tracker's id to
  `{ setName, packCount, packs }`, where `packs` is an array of packs (unchanged grouping from
  today's `drawSimulatedPull`), each an array of the richer per-card objects above. This mirrors
  the existing session-only state pattern already used for `setCardPoolCache`/`expandedTrackers`/
  `selectedSetName` — never written to the shared `localStorage` blob.
- **Rationale**: Spec's Edge Cases require Reattempt to reuse the *original* draw's set and pack
  count even if the page's (single, shared) `selectedSetName` has since changed — so the pending
  pull must snapshot those two values itself at draw time rather than reading the live globals
  when Reattempt runs.
- **Alternatives considered**: Storing the pending pull on the `tracker` object itself (in the
  persisted `collection` blob) was rejected — spec's Assumptions explicitly call it session-only;
  persisting an unsaved draft would also mean it survives a reload in a half-decided state, which
  the spec explicitly does not ask for.

## Decision: Keep the existing per-pack grouping internally; Save still produces one `Pull` per
pack

- **Decision**: `packs` keeps today's "one pack = one array of `CARDS_PER_PACK` cards" shape
  internally, even though the minicard review flattens all packs into a single visual list. Save
  iterates `packs` and calls the existing `logPull` once per pack (passing that pack's card names
  joined by newline, exactly as today's immediate-commit path already does).
- **Rationale**: `computeTrackerProgress`'s `packsOpened` is `tracker.pulls.length` — this project
  already fixed a real undercounting bug (feature 003) by making sure N requested packs become N
  separate `Pull` entries, not one combined entry. Flattening `packs` before Save would silently
  reintroduce that exact bug. Reusing `logPull` unchanged also means the backlog merge rule
  (`addOrIncrementCard`) is untouched — Save adds only `{ name, quantity }` to the backlog, never
  the richer per-card fields, matching FR-004's "using the existing merge-by-name rule" wording
  precisely (no scope creep into enriching backlog cards with pulled cards' image/type data).
- **Alternatives considered**: Flattening into one `Pull` per Save was rejected for the
  `packsOpened` regression risk above. Also considered: merging the richer fields onto the
  backlog's `OwnedCard` entries the way `collection.js`'s search-and-select flow does (feature
  004) — rejected as out of scope; the spec only asks for review/commit behavior and minicard
  detail, not backlog data enrichment, and the smaller change is preferred absent an explicit ask.

## Decision: Minicard is a single click-to-modal control, not the 3-state tag from Card Tag
Interactions

- **Decision**: A minicard is a native `<button>` showing the card's name; one click opens
  `tracker.js`'s own `showModal` (already built in feature 004) with the image and known details.
  No hover overlay, no in-place image expansion, no "second click" distinction.
- **Rationale**: Spec's Assumptions explicitly call this out as a lighter-weight, one-step need,
  distinct from `collection.js`'s browsing-focused card tag. Reusing that heavier interaction here
  would be unjustified complexity for a review list that's only ever open briefly before the user
  picks Save/Reattempt/Discard.
- **Alternatives considered**: Reusing `collection.js`'s `renderCardTag` pattern verbatim was
  rejected both for the UX mismatch above and because it would violate this project's "no shared
  runtime code between pages" rule even harder than copying one function would.

## Decision: No confirmation modal for Discard or Reattempt

- **Decision**: Both actions run immediately on click, no `showModal` confirmation step.
- **Rationale**: Spec's Assumptions state this directly: nothing has been persisted yet, so
  there's nothing a confirmation would be protecting against losing. This is consistent with
  Constitution Principle I's confirmation requirement, which is scoped to destructive actions on
  already-saved state (deleting a tracker, removing a backlog card, etc.) — a still-pending,
  never-saved draft doesn't fall under that rule.
- **Alternatives considered**: Adding a confirmation "just to be safe" was rejected — it would add
  friction to the exact gesture (quickly rerolling an unwanted pull) this feature exists to make
  fast and frictionless.
