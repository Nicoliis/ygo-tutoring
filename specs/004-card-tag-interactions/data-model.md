# Phase 1 Data Model: Card Tag Interactions

Extends the Draft Collection Manager's existing `OwnedCard` entity; no new top-level persisted
entity. Adds page-wide, session-only UI state for tag expansion and modals.

## OwnedCard (extended)

| Field | Type | Rule |
|---|---|---|
| `id` | string | Unchanged — generated on creation. |
| `name` | string | Unchanged — required, non-empty after trim. |
| `quantityOwned` | integer | Unchanged — required, ≥ 0. |
| `apiId` | number or absent | The external database's own card ID, captured at add-time when the card was added via search-and-select (FR-009). **Absent** on cards added before this feature, or added by any path that doesn't resolve to a real database card. |
| `type` | string or absent | The card's type (e.g. "Normal Monster", "Spell Card"), captured at add-time. Drives which "key details" fields apply (FR-002). |
| `level` | number or absent | Monster-type only; absent for Spell/Trap or for cards with no database match. |
| `atk` / `def` | number or absent | Monster-type only; same absence rule as `level`. |
| `imageSmall` / `imageFull` | string (URL) or absent | Captured at add-time; `imageSmall` is used for the tag's expanded view, `imageFull` for the modal — mirroring `app.js`'s existing `image_url_small` / `image_url` distinction. |

**Validation**: Unchanged from the existing `OwnedCard` rules (data-model.md, Draft Collection
Manager) — `name` required non-empty after trim, `quantityOwned` integer ≥ 0. The new fields are
never required; their absence is the normal, valid state for any card not added through the new
search-and-select flow (spec Edge Case: "cards already in the backlog... with no database match
at all").

**Merge rule (unchanged)**: Adding a card that matches an existing entry by case-insensitive name
still increments `quantityOwned` rather than duplicating — now, if the existing entry lacks the
new fields and the newly-matched search result has them, the newly-looked-up fields are filled in
onto the existing entry (a free-text card "catches up" to a real one if the user later adds the
same name through search). This is additive only; it never removes or overwrites a field the
entry already had from its own earlier lookup.

## Session-only UI state (never persisted)

| Name | Shape | Purpose |
|---|---|---|
| `expandedCardId` | string or null | Which single card is currently image-expanded (FR-003). Page-wide, not per-list — setting it to a new card's id implicitly collapses whichever other tag held it before. |
| `activeModal` | object or null | The currently open modal's description (title, body renderer, buttons), if any. Only one modal is ever open at a time. |
| Drag state | implicit (native HTML5 Drag and Drop API) | Which card is being dragged and which container is currently a valid, highlighted drop target — held by the browser's native drag session plus a CSS class toggled on `dragover`/`dragleave`, not application state that needs its own variable. |

## Card Tag (rendering concept, not a stored entity)

A card tag is rendered from an `OwnedCard` (or, for an engine/deck content line, the `OwnedCard`
resolved from a `cardId` reference) plus the current `expandedCardId`:

- **Collapsed** (default): fixed-size chip showing the name (truncated if needed).
- **Hover** (desktop only — see touch note below): a tooltip-style overlay showing the full name
  and "key details" — for a Monster: level/rank and ATK/DEF; for a Spell/Trap: just the type; for
  a card with no looked-up data at all: just the name, nothing else (graceful degradation).
- **Image-expanded** (`expandedCardId === this card's id`): shows `imageSmall` in place of the
  chip; if `imageSmall` is absent, shows a "no image available" placeholder instead — clicking
  still works and still advances to the modal on a second click, per FR-004 (a missing image
  doesn't block the complete-details modal, which can still show whatever fields *are* known).
- **Second click** → opens the shared modal with the "complete details" view: full name, every
  known field (`type`, `level`, `atk`, `def`), and `imageFull` (or the same placeholder if
  absent).
- **Touch devices** (no hover): first tap reaches the image-expanded state directly, showing the
  same key details inline instead of via a hover overlay, per the spec's Assumptions; second tap
  opens the modal — same two-tap progression, no hover step required.

## Removal Confirmation (rendering concept, not a stored entity)

Every removal action this feature touches opens the same shared modal shape: a title naming the
action (e.g. "Remove card?"), a body identifying the specific item (name, and its image if
available), and Cancel/Confirm buttons. It covers, per FR-007:

| Context | Today | This feature |
|---|---|---|
| Remove a backlog card | Browser `confirm()` | Custom modal (same cascade-count messaging) |
| Delete a whole engine | Browser `confirm()` | Custom modal (same cascade-count messaging) |
| Delete a whole deck | Browser `confirm()` | Custom modal |
| Delete a whole tracker | Browser `confirm()` | Custom modal |
| Remove one card from inside an engine | **No confirmation today** | New: custom modal |
| Remove one item from inside a deck | **No confirmation today** | New: custom modal |
| Remove one checklist entry (`tracker.js`) | **No confirmation today** | New: custom modal |

Confirming always performs exactly the same underlying removal the existing (or, for the three
newly-confirmed cases, newly added) removal function already does — the modal only gates *when*
that function runs, never changes *what* it does.

## Error handling (FR-010)

A failed card search/add (network error, non-OK response, or no results):
- Shows a clear, user-facing message (the same `alert`-based pattern already used elsewhere in
  `collection.js`), e.g. "Couldn't reach the card database — check your connection and try
  again."
- Leaves the backlog, every engine, and every deck **exactly** as they were — the search result
  must be fully resolved before anything is added, so there is no partial-add state to clean up
  (same fetch-before-write guarantee the Set Pack Simulator established).
