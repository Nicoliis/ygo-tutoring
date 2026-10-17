# Phase 0 Research: Workshop, Store & Segregated Menu

## Decision 1: How to extract the Backlog element
- **Decision**: Create `shared/backlog-panel.js` exposing `mountBacklogPanel(containerEl, options)`. It builds the panel markup (search box, list container; optional "add from database" block) and wires the filter and rendering, reusing the existing `collection/` modules for tags, quantity stepper, details window and drag (`renderCardTag`, `buildBacklogQtyStepper`, `removeCard`, ...). Options: `allowAdd`, `allowRemove`, `allowQtyEdit`, `onChange`.
- **Rationale**: The current backlog code is spread across ~10 files that rely on page-level globals (`collection`, `backlogFilter`, `renderAll`). Moving the markup and filter wiring into one mount function gives one element for several screens while leaving proven code in place (Principle III).
- **Alternatives**: Rewrite as a self-contained component with its own state (high regression risk); copy markup per page (diverges, violates FR-001).

## Decision 2: How the new screens share code with Collection
- **Decision**: Each Workshop page loads the subset of `collection/*.js` it needs plus a small per-screen `render-all`/init file; the stored data shape (`ygoCollection[_id]`: `cards`, `engines`, `decks`) is unchanged. `collection/index.html` is retired (redirects to the Workshop) once the screens work; the JS stays in `collection/`.
- **Rationale**: Keeps Principle III's "small, local diffs" and means saved collections open untouched (SC-008).
- **Alternatives**: Move all JS to `workshop/` (large churn, no behavior gain).

## Decision 3: Add-from-database in the Backlog panel
- **Decision**: `allowAdd` is true only for profiles without run rules (Sandbox); in Progression Run profiles cards come from packs, so the "add from database" block is hidden.
- **Rationale**: Adding arbitrary cards would bypass the economy and the run; Sandbox keeps today's free-form behavior.
- **Alternatives**: Allow everywhere (breaks game integrity).

## Decision 4: Money representation and pricing rule
- **Decision**: Store money as integer cents (`balanceCents`). Price of the k-th purchase of a booster (k = 0 for the first) = `Math.round(100 × 1.5^k)` cents, rounded half up per purchase; the total for n packs is the sum of the rounded unit prices. Examples: 100, 150, 225, 338 (3.375 → 3.38), 506 (5.0625 → 5.06).
- **Rationale**: Integers avoid float drift (FR-017, SC-005); rounding each unit price makes the preview, the charge and the "next price" display always agree.
- **Alternatives**: Floating point (drift); round only the total (the next price can disagree with what was effectively charged).

## Decision 5: Sale value source
- **Decision**: Extend the pool entries with `setPrice` = the `set_price` of the card's `card_sets` entry for that set (parsed to cents, `null` when missing/0), carry it on pulled cards, and have `addPrinting` store it as `setPrice` on the printing at the first pull. Selling works per printing: it decrements that printing's `quantity` and `quantityOwned` and credits `setPrice`.
- **Rationale**: Fulfills "sell at the set_price of the set you pulled from" with data already fetched (Principle II). Old printings without `setPrice` and "unknown" copies simply have no sale value (clarified).
- **Alternatives**: Re-fetch card prices at sale time (extra API calls, drift); use the stored tcgplayer `price` (not what the user asked for).

## Decision 6: Allocation consistency when selling
- **Decision**: After a sale, if an engine or deck group now holds more copies of the card than `quantityOwned` allows (`maxAllowedInGroup`), reduce those groups to the new maximum; selling a copy that is currently needed by an allocation requires an explicit confirmation listing what changes.
- **Rationale**: Reuses the existing allocation limit and avoids decks with unowned cards (FR-011).
- **Alternatives**: Block selling allocated cards (annoying); ignore (invalid decks).

## Decision 7: Booster inventory and opening
- **Decision**: Run record gains `packInventory: { [setName]: count }`. A new "Bought boosters" panel in the Run area opens one at a time with the same opener: `extraPack: { setName, pack }` persists the in-progress pack exactly like the stage box. When finished, its cards merge into the backlog via `mergeCardsIntoBacklog`, and the inventory count drops by one.
- **Rationale**: Reuses `createPackReveal` and persistence patterns from 010; only the source and bookkeeping differ.
- **Alternatives**: A separate opener (duplicates behavior).

## Decision 8: Which boosters are "reached"
- **Decision**: Reached = every stage in `completed` plus the current stage. The offer list follows `MAINLINE_BOOSTERS` order.
- **Rationale**: Matches "boosters from dates already pulled"; derived from existing run state, no new data.
- **Alternatives**: Only completed stages (stricter; the current stage's box is already being opened).

## Decision 9: Menu segregation
- **Decision**: `shared/areas.js` defines four areas with their pages: Run (Progression Run), Workshop (Backlog, Synergy Builder, Deckbuilding), Store (Sell, Buy), Tools (Booster Draft, Proxy Sheet Builder, Progression Series Pack Puller). The sidebar shows only the current area's pages plus "Back to menu". Root `index.html` is the main menu: profile picker first, then four area cards. A `data-area` attribute on `<body>` switches a CSS variable theme.
- **Rationale**: Gives the immersive separation clarified by the user with no framework and minimal new JS.
- **Alternatives**: Tabs (same page frame, weaker separation); fully separate headers per page (duplicated chrome).

## Decision 10: Sandbox profile and the Store
- **Decision**: Store pages in a profile with no run rules show a message ("This profile has no balance") with links back; Workshop works normally in every profile.
- **Rationale**: Spec assumption; avoids inventing an economy for free play.

## Decision 11: Backward compatibility
- **Decision**: Every new field is optional on read: runs without `balanceCents` read as 0; printings without `setPrice` have no sale value; engines/decks/cards are unchanged.
- **Rationale**: SC-008 and the save-utils contract.

## Implementation note (T001): script sets of the Workshop screens
The `collection/` modules are mutually dependent (almost every file references `collection`, `renderAll`, `removeCard`, ...), so a per-screen subset gives no real decoupling. All three Workshop pages (`workshop/backlog.html`, `synergy.html`, `deckbuilding.html`) therefore load the same set: every `collection/*.js` file EXCEPT `collection-init.js` and `collection-render-all.js`, which are replaced by one small per-screen file (`workshop-backlog-init.js`, `workshop-synergy-init.js`, `workshop-deck-init.js`) defining that screen's `renderAll()`. The Backlog panel is mounted by an inline script before `collection-dom-refs.js` runs. `collection-search-wiring.js` is guarded so it works when the panel is mounted without the database search (Progression Run profiles).
