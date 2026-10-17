# Implementation Plan: Workshop, Store & Segregated Menu

**Branch**: `011-workshop-and-store` | **Date**: 2026-10-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/011-workshop-and-store/spec.md`

## Summary

Three connected changes on top of profiles (009) and the pack opener (010):

1. **Workshop**: the Collection page is split into focused screens. The Backlog panel becomes one reusable element (`shared/backlog-panel.js`) mounted by the **Synergy Builder** (Backlog + engines) and **Deckbuilding** (Backlog + engines + decks) screens. The existing engine/deck/backlog modules in `collection/` are reused, not rewritten, and the stored collection data does not change shape.
2. **Store**: Progression Run profiles get a **balance** (integer cents) and a **pack inventory**. Selling credits the printing's recorded `setPrice` (new field captured at pull time from the card data's per-set price); buying charges an escalating price (1.00, then ×1.5 per re-buy, rounded per purchase to cents). Bought packs are opened with the existing pack opener.
3. **Menu**: a **main menu with four areas** (Run, Workshop, Store, Tools). Each area has its own sidebar and visual theme (`data-area` + CSS variables) and a persistent "back to menu" control.

All persistence goes through `saveData`/`loadData`, keys stay `ygo*`-prefixed, and new fields live in existing records (printings in the collection, economy in the run record).

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Existing YGOPRODeck `cardinfo.php` (per-set `set_price` is already in its `card_sets` entries, verified 2026-10-17) and cached `cardsets.php`

**Storage**: `localStorage` via `saveData`/`loadData`. Extends printings (`setPrice`), the run record (`balanceCents`, `boosterBuys`, `packInventory`, `extraPack`), unchanged `ygoCollection[_id]` otherwise

**Testing**: Pure logic (pricing, balance, selling, inventory) added to `shared/contract-tests.js` and run by `shared/profiles.test.js` / `shared/tests.html`; UI validated via quickstart.md (constitution: no automated UI suite)

**Target Platform**: Modern desktop/mobile browsers

**Project Type**: Static multi-page web app (area folders with flat pages)

**Performance Goals**: Screens render in under 1 s with a few thousand cards; buying/selling apply instantly

**Constraints**: No new API calls (set prices come with the pool fetch already made when packs are generated); money is integer cents to avoid float drift; one action = one persisted change; existing saved data untouched

**Scale/Scope**: ~10 profiles, thousands of cards, ~150 boosters

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Confirmations on irreversible actions (sell last copy, purchase), visible balance, disabled-with-reason instead of silent failure, "back to menu" on every screen, keyboard/accessible controls kept. |
| II. Minimal API Footprint | Pass. Zero new requests: `setPrice` is captured from the card-pool fetch already done to generate a pack; booster prices are fixed rules, not API lookups. |
| III. Maintainability & Simplicity | Pass with note. Reuses the existing `collection/` modules via per-screen script sets instead of a rewrite; one shared backlog panel; no framework. Note: area themes use CSS variables only. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/011-workshop-and-store/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── workshop-store-menu-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── areas.js                 # NEW: AREAS table (id, label, pages, theme) + helpers; replaces nav-entries usage
├── areas.css                # NEW: per-area themes via [data-area] CSS variables
├── nav-*.js                 # CHANGED: sidebar built from the current area, "Back to menu" link
├── backlog-panel.js         # NEW: reusable Backlog element (list, search, details, drag, qty, add/remove options)
├── money.js                 # NEW (pure): cents helpers, priceForPurchase(k), totalForPurchases(k, n), formatMoney
├── printings.js             # CHANGED: printings keep setPrice; helper for sale value
└── pack-pool.js             # CHANGED: pool entries carry setPrice (card_sets[].set_price for that set)

collection/                  # modules reused by the new screens (state, engines, decks, tags, allocation...)
└── index.html               # RETIRED after the Workshop screens work (redirect to workshop/)

workshop/
├── backlog.html             # NEW: backlog panel alone (manage owned cards)
├── synergy.html             # NEW: Synergy Builder (backlog + engines)
├── deckbuilding.html        # NEW: Deckbuilding (backlog + engines + decks, YDK import/export)
├── workshop.css
└── workshop-*.js            # per-screen render-all / init glue

store/
├── sell.html                # NEW: balance + sell by printing
├── buy.html                 # NEW: reached boosters, quantity, total preview, buy
├── store-state.js           # NEW (pure + persistence): balance, buys, inventory in the run record
├── store-sell.js, store-buy.js, store-render.js
└── store.css

progression/
├── progression-state.js     # CHANGED: extraPack state for opening bought packs
├── progression-*.js         # CHANGED: "Bought boosters" panel using the same opener

index.html                   # CHANGED: main menu (profile picker + four area cards)
```

**Structure Decision**: Areas are folders with flat pages (`workshop/*.html`, `store/*.html`), so every page keeps the one-level `../shared/` layout the app already relies on. Existing tool folders stay where they are and are grouped under the Run and Tools areas by the `AREAS` table.

## Complexity Tracking

No constitution violations to justify.
