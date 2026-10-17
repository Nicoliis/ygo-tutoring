# Phase 0 Research: Pack Opening Experience & Pull History

## Decision 1: Where printing data lives
- **Decision**: Keep one record per card name in `cards[]` and add an optional `printings: [{ set, rarity, price, quantity }]` array. `quantityOwned` stays the total (≥ sum of printing quantities; any remainder is "unknown printing" for pre-feature copies).
- **Rationale**: Decks, engines and allocation limits reference cards by id and use `quantityOwned`. Splitting into per-printing records would force rewriting all of that. A nested array gives the spec's "grouped by printing" (FR-002) without touching allocation logic, and old records simply have no `printings`.
- **Alternatives**: Separate record per printing (breaks deck allocation); one record per copy (large, same breakage).

## Decision 2: Price semantics
- **Decision**: A printing stores the price at the first pull of that printing; later pulls of the same printing only increment its quantity.
- **Rationale**: Matches the clarified spec ("price recorded at first pull of that printing") and avoids unbounded history.

## Decision 3: Rarity name, ordering and glow
- **Decision**: Move the existing tier table and `getRarityGlow` from `draft/` into `shared/rarity.js`; add `rarityRank(rarity)` (index in the rarest-first table, unmatched/unknown = least rare) and `rarityLabel(rarity)` (the provider's rarity string, or "Unknown rarity"). Render a `.rarity-badge` text label next to the glow.
- **Rationale**: One source of truth for glow/ordering; the label text uses the provider's own rarity name so it is always explicit and never color-only (FR-005).
- **Alternatives**: Separate order table for sorting (would drift from glow tiers).

## Decision 4: Pack generation and secrecy
- **Decision**: Generate one pack at a time with the existing weighted pick (`pack-pool.js`), order the cards common first and rarest last (rarest = lowest tier index in the glow table), ties by price ascending, and store the pack's cards in the run record. The face-down DOM contains no name/rarity text and uses generic accessible names ("Face-down card 3 of 9").
- **Rationale**: Persisting the generated pack is what makes "resume face down" possible without re-rolling (FR-018). Secrecy is a UX property; localStorage content is not an anti-cheat boundary for a single-player local tool.
- **Alternatives**: Seed-based regeneration (more code, fragile if pool data changes).

## Decision 5: Persistence of reveal progress
- **Decision**: Extend `ygoRun_<id>` with `box: { packsOpened, pack: { cards, revealed: boolean[] } | null, pulled: card[] }`. Each reveal saves the run (cheap). When a pack's last card is revealed, merge all its cards into the backlog (backlog saved first, then the run advances `packsOpened`, clears `pack`). The stage's `boxOpened` becomes true when `packsOpened === 24`.
- **Rationale**: Run key is separate from the collection blob, so mid-pack reloads never touch collection data. One merge per pack keeps backlog writes at 24 per box.
- **Known limitation**: Two separate keys cannot be written atomically; a crash between backlog save and run save could double-merge one pack. Accepted (rare, single pack, user-visible).
- **Alternatives**: Merge per reveal (more writes, same atomicity gap); store pulled inside the collection blob (couples run state to a blob other tools rewrite).

## Decision 6: Animation approach
- **Decision**: CSS 3D flip (two faces, `transform: rotateY(180deg)`) then a "fly" using the Web Animations API: measure the card's rect and the next free slot rect in the pulled strip, animate the translate/scale, then reparent the node into the strip. Skip all animations when `prefers-reduced-motion: reduce` (reparent immediately).
- **Rationale**: No library, works with the layout, accessible fallback (FR-016).
- **Alternatives**: Animation library (violates Principle III), cloning absolutely positioned elements (more layout bugs).

## Decision 7: Booster pictures
- **Decision**: Extend the existing cached `cardsets.php` data to keep a set image URL when the response provides one; render each stage as a pack image (`img` with alt = set name) with CSS state classes: `pack-locked` (light gray/low opacity), `pack-next` (full color), `pack-opened` (darkened). Missing image → CSS placeholder pack showing the set name.
- **Rationale**: Reuses the one API call already planned (Principle II). Implementation must confirm at build time whether `set_image` is present in the live response; the placeholder path covers absence.
- **Verified 2026-10-16 (T001)**: the live `cardsets.php` response includes `set_image` (e.g. `https://images.ygoprodeck.com/images/sets/YS15.jpg`) for many sets but NOT all (e.g. "2-Player Starter Set" has none), and several sets share one image by set code. The placeholder path is therefore required, not optional.
- **Alternatives**: Separate image lookups per set (many requests, violates Principle II).

## Decision 8: Draft integration
- **Decision**: The draft calls the same component per booster: reveal the booster face down, then offer that booster's pick groups. Draft sessions remain in-memory (no new persistence); kept cards are merged with `set`, `rarity`, `price`.
- **Rationale**: Meets FR-019 with minimal change to the draft's existing pick logic.
- **Alternatives**: Reveal all boosters first, then pick (disconnects reveal from picking).

## Decision 9: Backward compatibility
- **Decision**: Everything new is optional on read: cards without `printings` show "Unknown rarity/set"; runs without `box` are treated as `{ packsOpened: 0, pack: null, pulled: [] }`; runs that already have `boxOpened: true` (old instant opener) stay opened.
- **Rationale**: SC-008 and the save-utils contract (never drop or require new fields).
