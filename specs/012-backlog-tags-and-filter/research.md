# Phase 0 Research: Backlog Card Tags & Type Filter

## Decision 1: How a card is assigned to its tab
- **Decision**: Classify from the card's `type` text (always stored) and fall back to `frameType` when present. Precedence, first match wins: Pendulum (type or frame contains "pendulum") → Link → Xyz → Synchro → Fusion → Ritual → Spell → Trap → Monster (everything else that is a monster, i.e. normal/effect/tuner/flip/etc.). A card with no recognizable type is "unclassified".
- **Rationale**: Matches spec FR-007; `type` exists on every card (even those saved before details were stored), so classification never depends on the background completion. Pendulum first because Pendulum cards can also be Fusion/Synchro/Xyz.
- **Alternatives**: `frameType` only (missing on older cards); `humanReadableCardType` (not stored).

## Decision 2: Value groups per tab
- **Decision**: Monster-like tabs offer `attribute`, `race` and one numeric group: `level` for Monster/Ritual/Fusion/Synchro/Pendulum, `rank` (the stored `level`) for Xyz, `linkval` for Link; Pendulum also offers `scale`. Spell and Trap tabs offer `subtype`, read from `race` (the card data stores the spell/trap kind there, e.g. "Quick-Play", "Continuous", "Counter"). Options are collected only from the user's cards of that tab.
- **Rationale**: Mirrors the clarified answer; uses fields the app already keeps (`race`, `attribute`, `level`, `scale`, `linkval`).
- **Alternatives**: Same groups for all tabs (empty options for Spell/Trap); free-text criteria.

## Decision 3: Combining rules
- **Decision**: Ticked tabs combine with OR (a card passes if its own tab is ticked and it matches that tab's values). Inside a tab, groups combine with AND and values inside a group with OR. No ticked tab = no type restriction. The name search is ANDed with the filter.
- **Rationale**: Matches the spec assumptions and is the least surprising model.
- **Alternatives**: AND across tabs (a card has exactly one tab, so it would match nothing).

## Decision 4: Cards without details
- **Decision**: A card missing a value that a selected group needs does not match (it cannot be verified). Opening the filter window triggers a one-time batched completion for cards that lack `race` (the detail fields come together): requests use `cardinfo.php?id=<comma-separated ids>` in chunks of 50; cards with no stored id fall back to one request by name. Results are stored on the cards, the Backlog and the window's values refresh.
- **Rationale**: Honors the clarified behavior and Principle II (a handful of requests instead of one per card; each card completed once).
- **Alternatives**: Per-card requests on hover (many requests, slow); always show incomplete cards (filter would lie).

## Decision 5: Persistence
- **Decision**: One per-profile key `ygoBacklogFilter` (`profileKey("ygoBacklogFilter")`), written only when the user presses Apply or Clear; loaded when the panel mounts. All screens mount the same panel, so they share it.
- **Rationale**: Meets "remember per profile" with the existing storage helpers; the key starts with `ygo`, so export/import include it.
- **Alternatives**: Session-only state (rejected by the user).

## Decision 6: Window mechanics
- **Decision**: Build the window with the existing `showModal` (title, body HTML, buttons). The body is a tab list (`role="tablist"`) and one panel per tab with the include checkbox and the value chips (checkboxes). Edits go to a draft copy; the Apply button copies the draft into the saved filter and re-renders; Cancel/Escape/backdrop discard; Clear resets saved and draft state.
- **Rationale**: Reuses focus trapping and Escape handling; Apply semantics are explicit as clarified.
- **Alternatives**: Custom dialog (duplicates focus management).

## Decision 7: One-click details and 205 px tags
- **Decision**: `renderCardTag(card, { draggable, directDetails: true })` is passed only by the Backlog rows; `wireCardTagClick` then opens the details window on click and Enter/Space, skipping the expanded-image state. Width is set with `.backlog-row .card-tag { width: 205px }`; engines and decks keep 132 px and their two-step click.
- **Rationale**: The spec scopes both changes to the Backlog.
- **Alternatives**: Change every tag (rejected by the spec's assumption).

## Decision 8: Scrollbar
- **Decision**: `scrollbar-width: thin` with `scrollbar-color` for Firefox and `::-webkit-scrollbar` rules (6–8 px, rounded thumb in the border/accent colors, hover brighter) for Chromium/Safari, scoped to the Backlog list.
- **Rationale**: Pure CSS, theme-aware via the existing variables, no JavaScript.
- **Alternatives**: A scrollbar library (violates Principle III).
