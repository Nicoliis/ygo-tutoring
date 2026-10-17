# Quickstart: Validating Pack Opening Experience & Pull History

Serve the repo root statically and use a profile in Progression Run mode. Use the browser console `localStorage.clear()` to reset if needed.

## Scenario 1: Face-down pack and reveal (US1)
1. Open Progression Run, press the open action for the current stage.
2. Expect a pack of face-down card backs; inspect the DOM: no card name/rarity/price text, accessible names read "Face-down card N of M".
3. Click a card: it flips, then flies to the pulled strip. Repeat for every card.
4. Expect the pack area to be empty and "Next pack" to the right. Reveal order should show common first, rarest last.
5. After the 24th pack's last card, expect "See pulled" instead; click it to see all box cards with rarity and set.

## Scenario 2: Resume mid-pack (US1, FR-018)
1. Reveal 2 cards of a pack, reload the page.
2. Expect the same pack: the 2 revealed cards in the strip, the others still face down; no re-roll.

## Scenario 3: Printings (US2)
1. Pull a card that exists in two sets with different rarities (or edit the data to simulate).
2. In Collection open the card details: expect two printing lines with set, rarity, price, quantity; total quantity matches.
3. Load a profile with pre-feature data: cards show "Unknown rarity", no errors.

## Scenario 4: Rarity glow and label (US3)
1. Reveal cards of at least three rarities.
2. Expect different glows and an explicit rarity name on each card (legible with the glow disabled in devtools).

## Scenario 5: Booster pictures (US4)
1. With a run at stage 3: stages 1–2 darkened, stage 3 clean, stages 4+ light gray.
2. Hover/focus a pack: name and state are announced/visible.
3. Fully open the stage's box: that pack becomes darkened.

## Scenario 6: Draft integration (FR-019)
1. Start a draft with 2 boosters: the first booster appears face down, reveal it, then its pick groups appear.
2. Keep cards and add them to the backlog: Collection shows the set/rarity/price for them.

## Scenario 7: Reduced motion and keyboard (FR-016, FR-017)
1. Enable "reduce motion" in the OS; reveal: cards move with no animation.
2. Tab to a face-down card and press Enter/Space: it reveals; focus lands on the next face-down card.

## Automated check
- `shared/profiles.test.js` / `shared/tests.html` include cases for `addPrinting`, `printingSummary`, pack state transitions and `stageState` (run with the VS Code runtime or a browser).
