# Implementation Plan: Duel Simulator

**Branch**: `019-duel-simulator` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-duel-simulator/spec.md`

## Summary

Turn the Duel Room into a table-top simulator: decks, hands, two playing fields, manual moves and hidden information, over the existing two-player link and the creator-authority session.

- **Split state**. The **public board** lives in the shared duel table (a new `sim` section): per player, the stacks in each field zone (card visible or face-down), the graveyard and banished piles, and the *counts* of hand, deck and extra deck. The **private state** (hand, deck order, extra deck, identities of face-down cards) lives only on its owner's device in its own storage key. A move is one public event; the identity of a card travels only when it becomes visible (played face-up, flipped, sent to a public pile) or is revealed.
- **Same sync as before**. Events are public and deterministic, so the existing session (creator numbers and applies, joiner applies the same events) keeps both public boards identical. A new hook (`onApplied`) lets each device update its own private state **only when its own event is confirmed**, so private and public never drift.
- **Moves by card menu**. Choose a card → an action menu for where the card is → a zone picker when needed (at most 3 steps). Field zones hold **stacks**: the newest card on top, lower cards drawn with a small x/y offset so they stay selectable. Moves are never refused for rule reasons; only impossible ones are (a card that is not where the page showed it, an empty pile).
- **Undo, reconnect, rematch**. Undo reverts the last own move through an *inverse event* kept in the log entry (public) and a private snapshot (own device). Reconnect restores private state from the device; a lost private state offers a rematch. Rematch is propose/accept, then each device rebuilds and reshuffles its own deck from the same choice.
- **Structure**. Pure rules (deck building, private state, board rules) are Node-tested; behaviour in `duel-play.js`; all DOM in `duel/views/`. The card details window gains an option to hide the engines panel during a duel (the duel never changes saved data).

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None new. Reuses the Duel Room link, `createDuelSession`, `applyEvent`, the card details window, the collection decks saved by the Workshop, card images already stored per card

**Storage**: Reads the active profile's saved collection (decks and cards) once at deck choice; writes only the duel's own keys: `ygoDuelRoom` (public table, as before, now with the board) and a new `ygoDuelPrivate` (this device's private state); never writes decks or the collection

**Testing**: Pure rules in `shared/contract-tests.js` (`shared/profiles.test.js`, `shared/tests.html`), including a privacy check that scans every message of a whole simulated duel; the page and the link with `quickstart.md` and the two-page real-time check used for the Duel Room

**Target Platform**: Current desktop and mobile browsers

**Project Type**: Static multi-page web app

**Performance Goals**: A move shows on the other page in under 1 s (same network) / 3 s (different); redrawing the board after a move under 100 ms for a 60-card deck

**Constraints**: Hidden information never leaves the device before it becomes visible (SC-004); a move is applied on both sides or on neither; no new network traffic types (public events only); keyboard operable; phone-width layout without sideways scrolling

**Scale/Scope**: Two players, decks of up to 60 main and 15 extra cards, logs of a few hundred events

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. Each move takes at most 3 steps with a menu that only offers what makes sense for the card's place; clear feedback for refusals; confirmations for rematch and clearing; keyboard operable; accessible names for zones and cards; undo for mistakes. |
| II. Minimal API Footprint | Pass. No card-database calls are added (card data and images come from the saved decks and the existing image links); the link carries only public duel events, as the amendment allows. |
| III. Maintainability & Simplicity | Pass. Pure, small modules (cards, private state, board) plus one behaviour file and view files; reuses the session, the table and the details window; no new dependency. |
| Additional Constraints (local only) | Pass. Private state is saved only in the player's browser; the link still carries only the duel table (the board is part of it) and names. |

Post-design re-check: unchanged, all gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/019-duel-simulator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── duel-simulator-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
duel/
├── duel-cards.js            # NEW pure: build a duel deck from a Workshop deck, card snapshots, shuffle, deal
├── duel-private.js          # NEW pure: this device's private state (hand, deck, extra, hidden identities) and its undo snapshots
├── duel-board.js            # NEW pure: the public board (zones, stacks, piles, counts) and its events, inverse events
├── duel-table.js            # applyEvent also handles the board events; table gains `sim` (null when no cards are used)
├── duel-session.js          # onApplied(event, table) hook so a device updates its private state once its own event is confirmed
├── duel-play.js             # NEW behaviour: deck choice, start, building events from menu actions, private persistence, rematch
├── duel-room.js             # shows the deck choice and the board once connected
├── index.html               # new scripts and styles
└── views/
    ├── duel-board-view.js   # NEW: both fields, stacks with offsets, piles, hand, card menu, zone picker, pile lists
    ├── duel-deck-view.js    # NEW: deck choice screen
    └── duel.css             # field grid, upside-down opponent field, stack offsets, hand row, menu
shared/
├── card-detail-window.js    # option to hide the engines panel
├── card-detail-modal.js, collection/collection-card-detail-modal.js   # pass that option through
└── contract-tests.js        # new checks
```

**Structure Decision**: Single static project. The pure modules hold every rule and are tested in Node; `duel-table.js` stays the one entry point for events so the existing session works unchanged; behaviour and drawing are separate files, drawing under `duel/views/`.

## Complexity Tracking

No constitution violations.
