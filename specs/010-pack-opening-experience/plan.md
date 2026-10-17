# Implementation Plan: Pack Opening Experience & Pull History

**Branch**: `010-pack-opening-experience` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-pack-opening-experience/spec.md`

## Summary

Four connected changes: (1) every pulled card remembers its **printing** (set, rarity, price) inside the existing per-card collection record; (2) a shared **rarity badge + glow** shows the rarity name explicitly everywhere a card with known rarity is rendered; (3) the Progression Run page renders **booster pictures** in three states; (4) a shared **face-down pack reveal** component (click → flip → fly to the pulled strip, rarity-ordered, values hidden, Next pack / See pulled) replaces instant box opening in the Progression Run and fronts each booster in the Booster Draft.

Approach stays plain HTML/CSS/JS: CSS 3D flip plus a measured "fly" animation done with the Web Animations API, state persisted through `saveData`/`loadData` inside the existing run record. Existing collection records are extended, never rewritten, so decks/engines (which reference cards by id) keep working.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. YGOPRODeck `cardinfo.php` (already used) and `cardsets.php` (already cached for dates; also read for set images if present)

**Storage**: `localStorage` via `saveData`/`loadData`. Extends `ygoCollection[_id]` cards with `printings`; extends `ygoRun_<id>` with `box` progress; extends `ygoSetDates` cache with set images. All keys already start with `ygo`.

**Testing**: Pure-logic additions covered in `shared/contract-tests.js` (run via `shared/profiles.test.js` or `shared/tests.html`); animation and layout validated manually via quickstart.md (constitution: no automated UI suite)

**Target Platform**: Modern desktop/mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: Flip+fly animation ≈ 600 ms per card; pack display immediate once the set's card pool is loaded; no layout jank with 9–15 cards per pack

**Constraints**: No new API calls (set images come from the already-cached `cardsets.php` response); `prefers-reduced-motion` skips animation; face-down state must not leak names/rarities in the DOM text or accessible names; existing saved data must load unchanged

**Scale/Scope**: 24 packs per box × ≤ ~15 cards; collections of thousands of cards

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Click/keyboard reveal, visible rarity names (not color-only), reduced-motion support, explicit states for next/see pulled, confirmation kept for irreversible stage actions. |
| II. Minimal API Footprint | Pass. Zero new requests: pack cards come from the existing cached set pool; booster images ride on the single cached `cardsets.php` call. |
| III. Maintainability & Simplicity | Pass with note. One shared reveal component reused by both flows, one shared rarity module (moved out of `draft/`), no framework. Note: the card record gains an optional `printings` array instead of splitting cards into per-printing records, to avoid rewriting deck/engine allocation logic. |
| Additional Constraints (local only) | Pass. |

Post-design re-check: unchanged, all gates pass. The hidden card values are stored locally (not cryptographically secret); the spec requires UI secrecy only.

## Project Structure

### Documentation (this feature)

```text
specs/010-pack-opening-experience/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── pack-reveal-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
shared/
├── rarity.js                  # MOVED from draft/rarity-glow-tiers.js + draft-rarity-glow.js: tiers, getRarityGlow, rarityRank, rarityLabel
├── rarity.css                 # NEW/moved: glow styles + .rarity-badge
├── printings.js               # NEW: addPrinting / printingSummary / total-quantity helpers (pure)
├── pack-reveal.js             # NEW: face-down reveal component (state in, events out)
├── pack-reveal.css            # NEW: card back, flip, pulled strip, action slot
├── backlog-merge.js           # CHANGED: takes {card, set, rarity, price} pulls and writes printings
└── contract-tests.js          # EXTENDED: printings + box state cases

progression/
├── progression-state.js       # CHANGED: box progress (packsOpened, current pack) + derived stage pictures state
├── progression-box.js         # CHANGED: generate ONE pack at a time, rarity-sorted
├── progression-boosters.js    # CHANGED: also keeps set image URLs
├── progression-render.js      # CHANGED: booster picture rail; opener mount
└── progression.css            # CHANGED: pack picture states

draft/
├── draft-start.js, draft-render-pick-group.js, draft-session.js   # CHANGED: reveal each booster before its pick groups
└── (draft glow css/js delegated to shared/rarity.*)

collection/
├── collection-card-detail / tag files                              # CHANGED: show printings list + rarity badge
```

**Structure Decision**: Keep one-folder-per-tool plus `shared/`. The reveal component is shared infrastructure; per-tool code only supplies cards, persistence and the "what next" button.

## Complexity Tracking

No constitution violations to justify.
