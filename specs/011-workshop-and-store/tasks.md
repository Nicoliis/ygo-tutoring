# Tasks: Workshop, Store & Segregated Menu

**Input**: Design documents from `/specs/011-workshop-and-store/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/workshop-store-menu-contract.md, quickstart.md

**Tests**: Pure logic (money, pricing, buying, selling, allocation clamping, run extensions) goes into `shared/contract-tests.js`, run by `shared/profiles.test.js` (Node, or VS Code's bundled runtime with `ELECTRON_RUN_AS_NODE=1`) and `shared/tests.html`. Screens and layout are validated manually via quickstart.md (constitution: no automated UI suite).

**Format**: `- [ ] [ID] [P?] [Story] Description with file path` — [P] = parallelizable (different files, no dependency on incomplete tasks).

**Hard rules for every task**: persistence only via `saveData`/`loadData`/`removeData` (no direct `localStorage`); do not change existing methods in `shared/save-utils.js`; preserve unknown fields on every write (spread existing records); every new field is optional on read (old runs have no `balanceCents`, old printings have no `setPrice`); money is always integer cents; the stored shape of `ygoCollection[_id]` (`cards`, `engines`, `decks`) does not change.

## Phase 1: Setup

- [X] T001 Create folders `workshop/` and `store/` with empty `workshop/workshop.css` and `store/store.css`, and note in `specs/011-workshop-and-store/research.md` which `collection/*.js` files each new screen loads once T011, T015 and T018 settle it (grep identifiers to compute each screen's script closure).

---

## Phase 2: Foundational (blocks all user stories)

- [X] T002 [P] Create `shared/money.js` (pure) per contracts: `toCents(value)` (price string/number to integer cents, `null` when missing/invalid/≤ 0), `formatMoney(cents)` (two decimals, e.g. `"4.75"`), `priceForPurchase(k)` = `round_half_up(100 × 1.5^k)` cents with k = 0 for the first purchase (100, 150, 225, 338, 506), `totalForPurchases(k, n)` = sum of the next `n` unit prices starting at index `k` (fresh booster, n = 3 → 475).
- [X] T003 [P] In `shared/pack-pool.js` add `setPrice` to every pool entry: `toCents(match.set_price)` where `match` is the `card_sets` entry for that set (`null` when absent); add `../shared/money.js` before `pack-pool.js` in `draft/index.html` and `progression/index.html`. `generatePack` already copies every pool field, so pulled cards carry `setPrice`.
- [X] T004 In `shared/printings.js` make `addPrinting` accept `setPrice` and store it only when the printing is created (first pull; never updated afterwards), add `printingSaleValue(printing)` (returns `setPrice` as integer cents or `null` when absent), and pass `setPrice: card.setPrice` from `shared/backlog-merge.js`. Constraint, verbatim: `setPrice` is an integer in cents ≥ 1 or absent; absent means no sale value; old printings and "unknown" copies are never sellable.
- [X] T005 Extend `shared/contract-tests.js` and the loaded sources in `shared/profiles.test.js` and `shared/tests.html` (add `money.js`) with cases for: `toCents` (valid, missing, zero, garbage), `priceForPurchase` (100, 150, 225, 338, 506), `totalForPurchases(0, 3) === 475` and `totalForPurchases(2, 2) === 225 + 338`, `addPrinting` storing `setPrice` at first pull and not changing it on later pulls, `mergeCardsIntoBacklog` carrying `setPrice`.
- [X] T006 Create `shared/areas.js` with `AREAS` (ids `run`, `workshop`, `store`, `tools`; pages: run → `progression/index.html`; workshop → `workshop/backlog.html`, `workshop/synergy.html`, `workshop/deckbuilding.html`; store → `store/sell.html`, `store/buy.html`; tools → `draft/index.html`, `proxy-builder/index.html`, `tracker/index.html`), `currentArea()` (match the current URL's folder; `null` on the main menu) and `hrefFromRoot(path)` (adds `../` when inside any area folder). Add a page to a `pages` list ONLY in the task that creates it (workshop pages in T011/T013/T016, store pages in T023/T027), so the sidebar never links to a page that does not exist yet; until then the Workshop and Store areas simply have no pages. Rewrite `shared/nav-entries.js` to use it while keeping the function names other scripts already call (`hrefForSlug`, `currentSlug`, `pageIsInsideToolFolder`) working.
- [X] T007 Update `shared/nav-sidebar.js` and `shared/nav-sidebar-item.js` so the sidebar shows the profile block, a "Back to menu" link (to the root `index.html`) and ONLY the current area's pages, highlighting the current one with `aria-current="page"`; remove the flat "Welcome" list.
- [X] T008 Create `shared/areas.css` (per-area theme via `[data-area="run|workshop|store|tools"]` CSS variables: accent and panel tint; run blue, workshop amber, store green, tools gray) and set `document.body.dataset.area` in `shared/nav-init.js` from `currentArea()`; link `areas.css` in every existing tool page (`progression/`, `draft/`, `proxy-builder/`, `tracker/`) and in the new pages as they are created.

**Checkpoint**: Existing tools still load; their sidebar now shows only their area; `setPrice` is captured for new pulls.

---

## Phase 3: User Story 1 - One reusable Backlog panel (Priority: P1) 🎯 MVP

**Goal**: A single Backlog element behaves identically on every screen that includes it.

**Independent Test**: quickstart.md Scenario 2.

- [X] T009 [US1] Create `shared/backlog-panel.js` with `mountBacklogPanel(containerEl, { allowAdd, allowRemove, allowQtyEdit, onChange })` returning `{ refresh }`. It builds the same markup the Collection page has today, using the SAME element ids `collection-dom-refs.js` looks up (`backlogSection`, `cardSearchInput`, `cardSearchStatus`, `cardSearchResults`, `backlogSearchInput`, `backlogList`), so the existing collection modules work unchanged; the "add from database" block is built only when `allowAdd`. It MUST be called before `collection-dom-refs.js` executes. Default `allowAdd` is `getActiveProfile().mode !== "progression"` (Sandbox only).
- [X] T010 [US1] In `collection/collection-render-backlog.js` honor the panel options (a global set by `mountBacklogPanel`): hide the quantity stepper when `allowQtyEdit` is false and the remove button when `allowRemove` is false; list rows still show quantity and the rarest-printing glow/badge.
- [X] T011 [US1] Create `workshop/backlog.html` (profile guard, `areas.css`, sidebar scripts, `rarity.*`, `printings.js`, modal and card-detail scripts, an inline `mountBacklogPanel` call before `collection-dom-refs.js`, then the `collection/*.js` closure for the backlog) and `workshop/workshop-backlog-init.js` defining `renderAll()` as `refresh()` plus the search wiring from `collection/collection-search-wiring.js` / `collection-run-search.js` when `allowAdd`. Record the final script list in research.md (T001).
- [X] T012 [US1] Make drag payloads from the panel identical on every screen (reuse `renderCardTag(card, { draggable: true })`) and verify that every screen's drop zones still read them; verify cards, quantities and rarity badges update on arrival from another screen (FR-002) because each page loads from storage and calls `refresh()` after any change.

**Checkpoint**: The Backlog works on its own screen; ready to be reused.

---

## Phase 4: User Story 2 - Synergy Builder screen (Priority: P1)

**Goal**: Backlog + engines on one screen; build and persist engines.

**Independent Test**: quickstart.md Scenario 3.

- [X] T013 [US2] Create `workshop/synergy.html` with the Backlog mount (T009) and an Engines section using the existing ids (`enginesSection`, `engineFormToggle`, `engineForm`, `engineNameInput`, `engineList`), plus the `collection/*.js` closure for backlog + engines (no deck or YDK files unless the closure requires them).
- [X] T014 [US2] Create `workshop/workshop-synergy-init.js`: `renderAll()` = backlog `refresh()` + `renderEngines()`; engine form submit/toggle wiring copied from `collection/collection-init.js`; the "click elsewhere collapses an expanded card tag" handler.
- [X] T015 [US2] Verify FR-004 on this screen (engines refuse more copies than owned or more than three per group using `maxAllowedInGroup`; removing a card from an engine keeps it in the Backlog; rename and delete ask for confirmation) and change the engine-delete confirmation text in `collection/collection-engine-delete.js` to say that cards already added to decks stay in those decks (spec edge case).

---

## Phase 5: User Story 3 - Deckbuilding screen (Priority: P1)

**Goal**: Backlog + engines + decks on one screen; add single cards or whole engines.

**Independent Test**: quickstart.md Scenario 4.

- [X] T016 [US3] Create `workshop/deckbuilding.html` with the Backlog mount, an Engines section (to add whole engines to decks) and the Decks section using the existing ids (`decksSection`, `deckCreateForm`, `newDeckNameInput`, `deckList`), plus the full `collection/*.js` closure including YDK import/export and the import modal.
- [X] T017 [US3] Create `workshop/workshop-deck-init.js`: `renderAll()` = backlog `refresh()` + `renderEngines()` + `renderDecks()`; deck create form wiring copied from `collection/collection-init.js`; the click-away handler.
- [X] T018 [US3] In `collection/collection-deck-engine-add.js` make adding an engine to a deck report which cards were skipped for exceeding the owned quantity or the three-per-section limit (FR-006), using the existing toast; keep every card that fits.
- [X] T019 [US3] Retire the old page: replace `collection/index.html` with a redirect to `../workshop/backlog.html` and make sure nothing in `shared/areas.js` links to it; keep all `collection/*.js` files in place. Verify decks created before this feature appear unchanged (FR-007, SC-008).

- [X] T036 [US3] Grep the whole app for `collection/index.html` and repoint every link: "Build decks" in `progression/progression-render.js` goes to `workshop/deckbuilding.html`; the "Collection" link in the no-run-rules panel and any other link goes to `workshop/backlog.html`; keep the redirect from T019 as a safety net for old bookmarks.

---

## Phase 6: User Story 4 - Run balance and selling cards (Priority: P2)

**Goal**: A balance per run and selling by printing at the recorded set price.

**Independent Test**: quickstart.md Scenarios 5 and 7.

- [X] T020 [US4] Create `store/store-state.js` with `getBalanceCents(run)` (`run.balanceCents || 0`), `canSell(card, printingIndex)` returning `{ ok, reason, valueCents }` (not ok when the printing has no `setPrice` or `quantity < 1`), and `sellPrinting(run, collection, cardId, printingIndex)` returning `{ run, collection }`: printing `quantity −= 1` (printing removed at 0), `card.quantityOwned −= 1`, `balanceCents += setPrice`. Constraint, verbatim: `balanceCents` is an integer ≥ 0, starts at 0 when absent, and never becomes negative.
- [X] T021 [P] [US4] Add `clampAllocationsToOwned(collection)` to `collection/collection-allocation.js` (or store-state.js): for every engine card entry and every deck `main`/`extra` entry, reduce `quantity` to `maxAllowedInGroup(card)` and drop entries that reach 0; call it from `sellPrinting`. Also report whether anything was reduced so the sell flow can confirm first.
- [X] T022 [US4] Add `../store/store-state.js` (and `../shared/money.js`, `../collection/collection-allocation.js` if `clampAllocationsToOwned` lives there) to the loaded sources in `shared/profiles.test.js` and `shared/tests.html`, then extend `shared/contract-tests.js` with cases for `canSell` (no setPrice, quantity 0, valid), `sellPrinting` (quantity and balance change, printing removed at 0, allocations clamped, unknown fields preserved) and the export containing `balanceCents` after a sale (FR-018).
- [X] T023 [US4] Create `store/sell.html`, `store/store-render.js` and `store/store.css`: a persistent balance header (shared with `buy.html`), the list of owned cards by printing with rarity badge, quantity, sale value and a Sell button; printings without `setPrice` and unknown copies show "No sale value" with the button disabled; a message with links back when the active profile is not a Progression Run (no balance); when any owned card lacks a sale value, a note: "Cards pulled before the Store existed have no sale value."
- [X] T024 [US4] Create `store/store-sell.js` wiring the Sell button: confirmation when the copy is needed by an engine/deck (listing what will be reduced), single application per click (guard against rapid clicks), save the collection first and then the run, show "Couldn't save — browser storage is unavailable or full." and apply nothing on failure.

---

## Phase 7: User Story 5 - Buying boosters with a rising price (Priority: P2)

**Goal**: Buy reached boosters at escalating prices; open them with the existing opener.

**Independent Test**: quickstart.md Scenario 6.

- [X] T025 [US5] Extend `store/store-state.js` with `reachedBoosters(run, list)` (completed stages plus current, in list order), `nextPriceCents(run, setName)` (`priceForPurchase(run.boosterBuys[setName] || 0)`), `canBuy(run, setName, n, list)` returning `{ ok, reason, totalCents, missingCents }` (reasons: not reached, invalid amount, not enough balance) and `buyBoosters(run, setName, n)` returning the updated run. Constraints, verbatim: `boosterBuys` and `packInventory` map set name → integer ≥ 0; `n` is an integer ≥ 1; a booster's price never resets.
- [X] T026 [US5] Extend `shared/contract-tests.js` with cases for `reachedBoosters`, `nextPriceCents` (100, 150, 225, 338 across consecutive buys), `canBuy` (not reached, amount 0, insufficient with the exact missing amount, exact balance ok), `buyBoosters` (balance, buys and inventory for n = 3 from 1.00 → 475 charged, next price 338) and persistence preserving unknown run fields.
- [X] T027 [US5] Create `store/buy.html` and `store/store-buy.js`: one card per reached booster (picture from `getSetImage` with the placeholder fallback, name, next price, quantity input, live total preview, Buy button with confirmation); block with the missing amount shown when the balance is insufficient; show the inventory count per booster; the same balance header and no-balance message as `sell.html`; money shown with `formatMoney`; each Buy click is applied exactly once (disable the button while the purchase is being applied and ignore repeated clicks), saving the run first and showing "Couldn't save — browser storage is unavailable or full." with nothing charged on failure. Add a link to the Run area's "Bought boosters" panel (`../progression/index.html`) and the unopened count per booster.
- [X] T028 [US5] Add `extraPack` support to `progression/progression-state.js` (`startExtraPack`, `revealInExtraPack`, `finishExtraPack` mirroring the box functions; runs without the field read as `null`) with contract-test cases, (`generatePack` already works for any set name).
- [X] T029 [US5] In `progression/progression-render.js` and `progression/progression-init.js` add a "Bought boosters" panel listing `packInventory` with an Open button per set; opening FIRST generates one pack with `generatePack(setName)`; only after it succeeds, `packInventory[setName] −= 1` and `extraPack` are saved in one write (on failure nothing changes and the count stays); and reuses `createPackReveal`, the pulled strip and the progress text; on completion merge the cards with `mergeCardsIntoBacklog` and clear `extraPack`; resume an in-progress `extraPack` on reload; failure messages as in the box flow.

---

## Phase 8: User Story 6 - Segregated, immersive menu (Priority: P2)

**Goal**: A main menu with four themed areas and a persistent way back.

**Independent Test**: quickstart.md Scenario 1.

- [X] T030 [US6] Change the root `index.html` into the main menu: keep the profile picker, and when a profile is active show four area cards (Run, Workshop, Store, Tools) generated from `AREAS`, each linking to the area's first page, with a one-line description; remove the old flat tool grid; style in `welcome.css` and `areas.css`.
- [X] T031 [US6] Give each area its distinct identity in `shared/areas.css`: header accent, panel tint and an area title shown in each page header (e.g. "Workshop · Synergy Builder"); make sure the sidebar's "Back to menu" stays visible when the sidebar is collapsed (add a header link on narrow screens).
- [X] T032 [US6] Verify the Tools area holds Booster Draft, Proxy Sheet Builder and Pack Puller unchanged, that every page keeps the active profile when moving between areas, and that no page shows another area's navigation.

---

## Phase 9: Polish & Cross-Cutting

- [X] T033 [P] Keyboard operability and accessible names for the new controls (Sell, Buy, quantity input, area cards, "Back to menu", Open bought booster); money changes announced politely (`aria-live`) on Sell/Buy screens.
- [ ] T034 Run every scenario in `specs/011-workshop-and-store/quickstart.md` in a browser and fix issues.
- [X] T035 Run the contract tests (`shared/tests.html`, or `shared/profiles.test.js` and `shared/save-utils.test.js` via Node/VS Code runtime), run the syntax and missing-reference scan over every page, and grep that no direct `localStorage` use exists outside `shared/save-utils.js`.

---

## Phase 10: Adjustments after first use (2026-10-17)

- [X] T037 Backlog tag overlays: hover details and the opened-tag view are now `position: fixed` on the page body, placed inside the viewport (above/below the tag as needed) and cleared whenever the lists redraw, so the last row no longer flickers, nothing is clipped and no scrollbar appears (`collection-card-tag-hover.js`, `collection-card-tag-expanded.js`, their CSS).
- [X] T038 Unpriced copies: pool entries get `setPrice` = set price, else Cardmarket price, else 0.01 (`resolveSalePriceCents` in `shared/money.js`); `printingSaleValue` returns 0.01 for printings without one; copies with no printing sell for 0.01 (`canSell`/`sellPrinting` accept index -1). Tests updated.
- [X] T039 Store card details: the card name in each Sell row opens the card-details window; the Store pages load the modal scripts.
- [X] T040 Backlog compression: each card is listed once with its rarest rarity; opening it lists the copies per rarity (`rarityCounts`, `buildRarityCountsHtml` in `shared/printings.js`).
- [X] T041 Set information in the Store: printings keep the set code (`setCode`, from the card data's `set_code`) and each Sell row shows "Set · CODE"; the card-details window shows set and code on Store pages.

- [X] T042 Profile selection and the main menu are two separate screens: `index.html` is only the profile screen (Play or create leads to the menu), `menu.html` is the main menu with the four areas and a "Switch profile" button; "Back to menu" links go to `menu.html`, "Switch profile" goes to `index.html`, and the guard sends a missing profile to the profile screen from any page.
- [X] T043 No more fixed maximum widths: pages use the whole screen with a fluid side margin (`--page-gutter`), card grids fill the row (`auto-fill`), the Store lists use the room, and the Tracker panels are no longer capped at 760 px.

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (blocking) → stories. T006 → T007 → T008. T002 before T003 and T005; T004 after T003.
- US1 (Phase 3) blocks US2 and US3 (they mount the panel): T009 → T010 → T011 → T012.
- US2 and US3 are otherwise independent; T019 (retire Collection) and T036 (repoint links) after T016–T018. Task ID T036 sits in Phase 5 because it belongs there; IDs are therefore not in file order.
- US4 needs T002–T004 (set prices) and T020 → T021 → T022 → T023 → T024.
- US5 needs US4's `store-state.js` and the header from T023: T025 → T026 → T027; T028 → T029.
- US6 can start after T006–T008 but its final pages (T030) need all area pages to exist.
- Polish last.

## Parallel Opportunities

- T002 and T003; T021 alongside T020; US2 and US3 phases after US1; T028 with T025–T027; T033 with T034.

## Implementation Strategy

1. **MVP**: Phases 1–3 (foundations plus the reusable Backlog screen). Validate quickstart Scenarios 1–2.
2. Add US2 and US3 (Synergy Builder, Deckbuilding) and retire the Collection page.
3. Add the economy: US4 selling, then US5 buying and opening bought packs.
4. Finish the menu theming (US6) and Polish.
