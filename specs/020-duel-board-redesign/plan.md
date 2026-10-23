# Implementation Plan: Duel Board and Fan Menu Redesign

**Branch**: `020-duel-board-redesign` | **Date**: 2026-10-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/020-duel-board-redesign/spec.md`

## Summary

Replace the two-field board and the list menu of the Duel Simulator (spec 019) with one 7 by 5 board and a fan-up radial menu, keeping the link, the session, the private/public split, undo, reconnect, rematch and the details window.

- **One grid, one layout constant**. `BOARD_LAYOUT = ["dpppppe","gpppppp","bXSXSXB","PPPPPPG","EPPPPPD"]` is the single source of the board. A pure function turns it into cells for the viewer (kind, side, slot); the opponent's cells are the same layout turned 180 degrees, so each player has 11 playable slots (`0..10`, reading order of their own view) and there are 2 shared slots.
- **Public board**. `side.zones` (four kinds of stack lists) becomes `side.field` (11 stacks); `sim.shared` (2 stacks) is new; piles keep their shape. A stack entry's original owner is the side prefix of its `uid` (`"<side>-<n>"`), so no new data is stored for ownership.
- **Control and ownership**. A card sits in the field of the player who controls it (own field, the other player's field after **Give control**, or a shared zone). Whatever the controller moves, a card that leaves the field always goes to its owner's piles. A card is never sent face-up to a pile unless its data is known to the mover (face-up, or the mover's own card); the owner's device updates its private state when another player's event sends one of its cards to its hand, deck or extra deck.
- **Menu as data, fan as view**. A pure `duel-menu.js` builds the menu tree for a card's place and resolves a chosen path into an action (kind, facing, orientation, destination). A pure `fan-layout.js` computes the button positions of a fan (semicircle, flipped or shifted to stay on screen). `views/duel-fan-view.js` draws the fans. `duel-play.js` only wires paths to events.
- **New and changed events**. `move` gains side-aware places; `flip` and `position` stay (Play on a placed card uses them when the zone is unchanged); new `give` (Give control), `signal` and `signal-clear`. Signals are a single "last signal" in the public board; their disappearance after a few seconds is a local, per-device timer (nothing synced).
- **Old duels**. The board carries `layout: 2`; a saved duel without it is reported as using the old board, with a rematch offer.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses the Duel Room link, `createDuelSession`, `applyEvent`, the card details window and the 019 private state and deck building

**Storage**: Same keys as 019 (`ygoDuelRoom`, `ygoDuelPrivate_<side>`); no new keys. The saved public table gets `sim.layout`; the private state does not change shape

**Testing**: Pure Node contract tests in `shared/contract-tests.js` (board cells for both sides, board events including give, shared and ownership, menu tree and path resolution, fan layout bounds, privacy scan of a whole duel, old-board detection), plus the real-time two-page check and headless screenshots at 360 px and 1280 px

**Target Platform**: Current desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: A fan opens in under 100 ms; a move shows on the other page as in 019 (1 s / 3 s)

**Constraints**: Hidden information never leaves the device before it becomes visible; fan buttons at least 44 px and always fully on screen; keyboard operable; whole grid fits at 360 px without sideways scrolling; no new network traffic types

**Scale/Scope**: Two players, 35 board cells, decks of up to 60 main and 15 extra cards, a menu tree of about 30 nodes

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Any play takes at most 5 selections, a move to a pile at most 4; the fan only shows what makes sense for the card; keyboard operable (arrows, Enter, Escape) with accessible names; touch-size buttons; clear refusal messages (for example a face-down card that cannot be sent face-up). |
| II. Minimal API Footprint | Pass. No card-database calls; the link still carries only public duel events (signals and gives are public events). |
| III. Maintainability & Simplicity | Pass. The layout is one constant; the menu tree and fan geometry are small pure modules; the old per-kind zone code is removed, not duplicated; no dependency added. |
| Additional Constraints (local only) | Pass. Nothing new is stored beyond the duel's own keys. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/020-duel-board-redesign/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── duel-board-menu-contract.md
├── checklists/requirements.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
duel/
├── duel-board.js            # CHANGED pure: BOARD_LAYOUT, boardCells(), 11-slot field, shared zones, side-aware moves, give, signal, layout version
├── duel-table.js            # CHANGED: new event kinds in SIM_KINDS, log lines for give/signal/banish/move, undo rules for gives and foreign moves
├── duel-private.js          # CHANGED: owner's device applies another player's move of its card into hand/deck/extra
├── duel-menu.js             # NEW pure: the menu tree per card place and the resolution of a chosen path into an action
├── fan-layout.js            # NEW pure: button positions of a fan, kept inside the window
├── duel-play.js             # CHANGED behaviour: menu paths -> events, zone picking over 11 + 2 slots, deck fan, signals, old-board notice
├── duel-room.js             # CHANGED: old-board notice with rematch offer
├── index.html               # new scripts and styles
└── views/
    ├── duel-board-view.js   # CHANGED: single 7x5 grid from BOARD_LAYOUT, hands, shared zones, signal markers; list menu removed
    ├── duel-fan-view.js     # NEW: draws the fans and handles keyboard and outside clicks
    └── duel.css             # CHANGED: grid, upside-down opponent cards, fan buttons, markers
shared/
└── contract-tests.js        # new checks
```

**Structure Decision**: Single static project. All rules stay pure and Node-tested; behaviour is `duel-play.js`; all DOM is under `duel/views/`. The 019 zone kinds (`monster`, `spell`, `field`, `pendulum`) are removed from the code, not kept beside the new field.

## Complexity Tracking

No constitution violations.
