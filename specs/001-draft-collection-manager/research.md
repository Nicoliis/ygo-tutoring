# Phase 0 Research: Draft Collection Manager

All items in the plan's Technical Context were resolvable from the existing repository
conventions and the constitution; no items required external research or carry a
`NEEDS CLARIFICATION` marker. This document records the technology/approach decisions made and
why, per the Phase 0 output contract.

## Decision: Vanilla JS/HTML/CSS, no build step, no framework

- **Decision**: Implement entirely in plain JavaScript, HTML, and CSS, loaded directly by the
  browser with no bundler, transpiler, or package manager.
- **Rationale**: Constitution Principle III mandates this unless a dependency's complexity cost
  is explicitly justified; nothing in this feature (local CRUD over three small entities) needs
  more than what the DOM and plain JS already provide.
- **Alternatives considered**: A small framework (e.g. a reactive view library) was considered
  for managing the backlog/engine/deck list re-renders, but rejected — the existing
  proxy-builder page already demonstrates that manual `innerHTML` re-rendering (as in
  `renderDeck()`/`renderResults()`) is sufficient at this scale and keeps the feature
  dependency-free.

## Decision: `localStorage` as the sole persistence layer

- **Decision**: Persist the backlog, engines, and decks as a single JSON object under one
  `localStorage` key, read on load and written after every mutation — mirroring the existing
  `ygoDeck` / `STORAGE_KEY` pattern in `app.js`.
- **Rationale**: Matches the constitution's "Additional Constraints" (client-side only, no
  backend/server-side state) and the proven pattern already in this codebase.
- **Alternatives considered**: IndexedDB was considered for its larger storage ceiling and query
  capability, but rejected as unjustified complexity for the target scale (low hundreds of
  cards, single-digit counts of engines/decks per SC-006) — a JSON blob in `localStorage` is
  simpler and consistent with Principle III.

## Decision: No live external card lookup in this iteration

- **Decision**: Card names are free-text entry; no call to the YGOPRODeck API (or any API) is
  made by this feature.
- **Rationale**: The spec's Assumptions explicitly make this optional ("may reuse one if
  convenient"), and omitting it entirely guarantees Constitution Principle II (Minimal API
  Footprint) is trivially satisfied — zero new network calls to reason about, debounce, or
  abort.
- **Alternatives considered**: Reusing the existing `fetch`-based search (debounced, with
  `AbortController`) from `app.js` for name autocomplete was considered as a nice-to-have, but
  deferred — it can be layered on later without changing the data model, using the exact same
  debounce/abort pattern already established, if real usage shows it's needed.

## Decision: New sibling page (`collection.html`/`.js`/`.css`) rather than extending the existing app

- **Decision**: Build this feature as its own page/script/stylesheet trio, separate from
  `index.html`/`app.js`/`style.css`.
- **Rationale**: Constitution Principle III favors small, local diffs and single-responsibility
  organization; the collection manager (backlog/engines/decks) and the proxy-sheet builder
  (search/mark/print) are two independently useful, independently testable workflows that
  happen to share a card-game domain, not one workflow — merging them would entangle unrelated
  concerns in one file.
- **Alternatives considered**: A single merged page/script was rejected for the reason above. A
  separate framework-based app was rejected as it would violate Principle III outright.

## Decision: Allocation counts are computed, not stored

- **Decision**: Each owned card's "allocated" and "available" quantities are derived at render
  time by summing references to that card across all engines and decks, not stored as a
  separate mutable field.
- **Rationale**: Storing allocation as derived state eliminates an entire class of sync bugs
  (the stored count drifting from the true sum after an edit/delete) — directly serving
  Principle III (Maintainability & Simplicity): one source of truth, fewer code paths.
- **Alternatives considered**: Maintaining a running counter updated imperatively on every
  deck/engine mutation was rejected as more error-prone (every mutation site would need to
  remember to update it) for a negligible performance gain at this scale.
