# Phase 0 Research: Collection Bags & Deck Export

No item in the plan's Technical Context carries a `NEEDS CLARIFICATION` marker (all were resolved
during `/speckit-specify` and `/speckit-clarify`). This document records the remaining technical
decisions and why.

## Decision: Backfill lookup uses `?name=` (exact match), not `?fname=` (fuzzy), and is triggered
per-card on first interaction

- **Decision**: A new `maybeBackfillCardDetails(card)` fires on a card tag's first `mouseenter`/
  `focus`/`click` if `!card.apiId && !lookupAttempted.has(card.id)`. It calls
  `cardinfo.php?name=<exact card name>` (an exact-match lookup, distinct from the fuzzy `?fname=`
  the interactive search box uses) and, on success, additively fills in the same fields
  `extractCardDataFromApiResult` already produces for the search-and-select flow. `lookupAttempted`
  is added to *before* the fetch resolves, so a failure is never retried within the same page load
  (FR-003).
- **Rationale**: `?name=` is the right tool for "I already know the exact stored name, find its
  real record" — `?fname=` is for fuzzy, as-you-type human search and would risk matching the
  wrong card for an ambiguous substring. Gating on first interaction (not on render) keeps this to
  exactly the cards the user actually looks at, never the whole backlog at once (Constitution
  Principle II).
- **Alternatives considered**: Eagerly backfilling every backlog card on page load was rejected —
  for a backlog of hundreds of pre-existing cards this could mean hundreds of simultaneous
  requests, exactly what Principle II exists to prevent. A manual "Refresh details" button per card
  was rejected as an extra, unnecessary step given hover/click already naturally signals interest.

## Decision: `effect` (card description) joins the same extraction helper, used everywhere

- **Decision**: `extractCardDataFromApiResult` gains `effect: apiCard.desc || null`, so every path
  that already calls it (search-and-select add, and now the backfill lookup) captures it
  identically. The full detail modal (`openCardDetailModal`) renders it as one more field.
- **Rationale**: One extraction helper, one field list — avoids the two enrichment paths (add-time
  vs. backfill-time) drifting out of sync with each other (Constitution Principle III).
- **Alternatives considered**: A separate, effect-only lookup triggered only when the detail modal
  opens was rejected — it would be a second network-call shape for data the first lookup already
  retrieves in the same response.

## Decision: Deck storage drops the `items`/`type` discriminator entirely in favor of two plain
arrays, `main` and `extra`

- **Decision**: A `Deck` becomes `{ id, name, main: [{cardId, quantity}], extra: [...] }`. Dropping
  an engine onto either section immediately resolves it into that section's plain card entries
  (incrementing existing ones) — a deck never stores `{type: 'engine', engineId, copies}` again.
- **Rationale**: Directly reflects the clarify-phase decision that "engines are groups of cards
  that work together; when added to a deck they're added as cards, not engines." It also
  incidentally resolves what would otherwise have been a structural dilemma (an engine's cards can
  span both Main and Extra, so a single tracked engine-reference item couldn't cleanly belong to
  one section) without needing special-case code.
- **Alternatives considered**: Keeping a `type` discriminator with engine references spanning both
  sections (e.g., a `sections: {main: n, extra: m}` split per engine reference) was the original
  two-tier design considered during clarification — rejected by the user directly in favor of the
  simpler, flatter model.

## Decision: One-time, in-place migration from old `items` to `main`/`extra` on load

- **Decision**: `loadCollection()` runs each parsed deck through a migration step: if it still has
  an `items` array (old shape) and no `main`/`extra`, build `main` from every old card-type item
  (quantity unchanged) and every old engine-type item (resolved into that engine's *current*
  composition, quantities multiplied by the old `copies` value, using the same merge-by-cardId
  logic as a live engine-drop) — `extra` starts empty — then delete `items`. Already-migrated decks
  (no `items` key) pass through unchanged.
- **Rationale**: Matches spec's Edge Case exactly ("treated as entirely Main Deck content on first
  view... nothing is deleted") and reuses the same resolution math `resolveDeckCardList` already
  performs today, so there's no new algorithm to get right, just a new call site for it.
- **Alternatives considered**: A lazy, render-time migration (converting only when a deck is
  expanded) was rejected — it would mean `saveCollection()` could still write the old shape back
  out for a deck the user never expanded, leaving some decks permanently unmigrated.

## Decision: Drag-to-remove uses a second `dataTransfer` MIME type, read only by bin drop-zones

- **Decision**: A card rendered *inside* a bag (engine or deck section) is draggable with
  `dataTransfer.setData("application/x-bag-card-source", JSON.stringify({cardId, source}))` in
  addition to (not instead of) the existing `text/plain` cardId payload backlog cards already set.
  Only a bin drop-zone reads the custom MIME type; ordinary bag drop-zones (for *adding*) keep
  reading `text/plain` as before, so a card dragged out of one bag is not accidentally interpreted
  as "add to" whatever it's dropped on — only a drop squarely on a bin removes it.
- **Rationale**: Reuses the native HTML5 Drag and Drop API's existing multi-MIME-type support
  rather than inventing a new signaling mechanism; keeps add-targets and remove-targets reading
  disjoint data so the two gestures can never be confused for each other.
- **Alternatives considered**: A single shared payload shape with a `kind: 'add' | 'remove'` flag
  was considered, but two distinct MIME types is simpler to reason about at each drop-zone (an add
  zone simply never looks at the remove-only type, and vice versa) and needs no extra
  `if (kind === ...)` branching at every drop handler.

## Decision: Every drag-to-bin removal keeps a non-drag, keyboard-operable equivalent

- **Decision**: Each card rendered inside a bag keeps the small, focusable "✕" remove button this
  app already uses for engine/deck item removal, shown alongside the bin — it calls the exact same
  removal function the bin's drop handler calls. Neither one needs a confirmation modal (spec
  Assumptions): removing a card from a bag doesn't touch the backlog.
- **Rationale**: Directly satisfies Constitution Principle I's keyboard-operability requirement
  without inventing a new interaction pattern — this app already has a proven, accessible "remove
  from a list" button; the bin is an additional, convenient drag target alongside it, not a
  replacement.
- **Alternatives considered**: Keyboard-focusing the bin itself and pressing Enter to "remove the
  currently focused card" was rejected as a more convoluted, less discoverable interaction than
  keeping the existing per-card remove button.

## Decision: YDK export/import format and scope

- **Decision**: Export produces `#main` / `#extra` / `!side` (empty) sections, one line per card
  copy, each line the card's `apiId` (its database passcode) — the standard YDK shape. A card
  lacking a stored `apiId` (never looked up) is skipped from the export with a clear, listed
  warning, mirroring Import's own skip-and-report behavior (FR-013/FR-017) for symmetry. Export
  copies the text to the clipboard and also offers a `.ydk` file download, matching this app's
  existing clipboard+file export pattern (previously `.txt`, now `.ydk` with real YDK content).
  Import accepts pasted text or an uploaded `.ydk` file, parses its `#main`/`#extra` sections,
  matches each passcode against `collection.cards` by `apiId` only (FR-016 — no network call), and
  replaces the target deck's `main`/`extra` with the matched cards, reporting any unmatched
  passcodes (FR-017).
- **Rationale**: YDK is the real, standard format this kind of request refers to (spec Assumptions)
  and is simple, well-documented plain text — no library needed to read or write it.
- **Alternatives considered**: Looking up unmatched passcodes against the live API during import
  was rejected per the clarify-phase decision (FR-016) — it would add a new, potentially
  multi-request network call shape to a single import action.
