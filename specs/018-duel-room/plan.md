# Implementation Plan: Duel Room

**Branch**: `018-duel-room` | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-duel-room/spec.md`

## Summary

A new Tools page, **Duel Room** (`duel/index.html`), where two players link their browsers directly with a manual exchange of two text codes and then share a duel table.

- **Link**: a browser-to-browser data channel (WebRTC, built into browsers, no library). The creator makes an *invitation code*; the joiner pastes it and gets a *reply code*; the creator pastes the reply and the channel opens. Codes carry the full connection offer (gathered before showing it, so no extra messages are needed) and are plain text with a version prefix, tolerant of whitespace and chat noise. A public STUN address helps find a path; nothing of this project is a server.
- **Table**: a pure, deterministic duel table (life points from 8000, turn, phase, last coin/die, event log). **The creator is the authority**: the joiner sends *intents*, the creator turns them into *events* (resolving randomness for coin and die), numbers them, applies them and sends each numbered event to the joiner. Both sides apply the same pure `applyEvent`, so both always end with the same table and log order, even with simultaneous edits.
- **Resilience**: the table is saved in each browser after every event; a drop shows "Opponent disconnected"; *Reconnect* repeats the code exchange for the same duel and the creator's table replaces the joiner's (with a notice). A failed link ends in a clear message after 30 seconds.
- **Structure**: pure rules (`duel-table.js`, `duel-code.js`) tested in Node; a thin link wrapper (`duel-link.js`); behaviour (`duel-room.js`); all DOM in `duel/views/`.
- **Governance**: the constitution says nothing is transmitted except calls to the card database. This feature's purpose is a player-to-player link, so the constitution is amended (MINOR version) as part of the work, with its own task.

## Technical Context

**Language/Version**: Plain HTML/CSS/JavaScript (ES2020), no build step

**Primary Dependencies**: None. Uses the browser's `RTCPeerConnection` / `RTCDataChannel`, `navigator.clipboard` (with a fallback selection) and `localStorage`. One public STUN address (`stun:stun.l.google.com:19302`) as a named constant; no TURN

**Storage**: `localStorage` key `ygoDuelRoom`: `{ duelId, role, names, table }` (the last duel of this browser); not part of profiles or the save file

**Testing**: Pure table rules and code encode/decode in `shared/contract-tests.js` (`shared/profiles.test.js`, `shared/tests.html`); the link and the page are verified with `quickstart.md`, including a two-tab loopback check in headless Chromium

**Target Platform**: Current desktop and mobile browsers that support data channels (Chrome, Edge, Firefox, Safari)

**Project Type**: Static multi-page web app

**Performance Goals**: A change appears on the other page in under 1 s (same network) / 3 s (different networks); connect in under 2 minutes of human time

**Constraints**: No backend; connection attempt gives up after 30 s with a clear message; only names and table data cross the link; the link is exactly two players; codes work after being pasted with extra whitespace or text around

**Scale/Scope**: Two players, one duel table, a log of up to a few hundred events

## Constitution Check

| Principle | Assessment |
|-----------|------------|
| I. Usability First | Pass. A guided create/join flow with one clear next step on each screen, copy buttons, clear statuses (`aria-live`) for waiting, connecting, connected, failed and disconnected, plain-language failure help, keyboard operable, a confirmation before clearing the saved duel. |
| II. Minimal API Footprint | **Needs amendment.** It limits network traffic to calls to the card database. The Duel Room needs a direct link between the two players (and a public STUN lookup). It adds no calls to the card database and no polling. See Complexity Tracking. |
| III. Maintainability & Simplicity | Pass with a note: no library or build step; native browser features only; small single-purpose files (pure rules, link wrapper, behaviour, views); the code format is versioned and tiny. |
| Additional Constraints (local only) | **Needs amendment.** "Nothing is transmitted except calls to YGOPRODeck" is replaced by "…and, in the Duel Room, a player-to-player link carrying only names and the duel table". |

Post-design re-check: Principle II and the "local only" constraint are the only gates; both are handled by the amendment task (constitution 1.1.0). Everything else passes.

## Project Structure

### Documentation (this feature)

```text
specs/018-duel-room/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── duel-room-contract.md
└── tasks.md             # created by /speckit-tasks
```

### Source Code (repository root)

```text
duel/
├── index.html               # NEW page: Duel Room
├── duel-table.js            # NEW pure rules: table, events, applyEvent, log, undo, winner
├── duel-code.js             # NEW pure codec: invitation/reply code encode, decode, validate
├── duel-link.js             # NEW link wrapper over RTCPeerConnection: offer/answer, channel, timeouts, status
├── duel-room.js             # NEW behaviour: room state machine, authority, sync, save/restore, reconnect
└── views/                   # NEW folder: rendering only
    ├── duel-view.js         # setup panel (create/join, code boxes), status, table, log
    └── duel.css             # layout of the room, table and log
shared/
├── areas.js                 # Tools lists the Duel Room; "duel" joins AREA_FOLDERS
└── contract-tests.js        # new checks
.specify/memory/constitution.md   # amended (v1.1.0) to allow the player-to-player link
```

**Structure Decision**: Single static project. A new `duel/` area folder holds the page; the pure rules and the code format are separate Node-testable files; the browser-link wrapper is thin and isolated so everything else can be tested without a network; all DOM building lives in `duel/views/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Peer-to-peer traffic between players (constitution Principle II and "local only") | The feature is a match between two people on two devices; nothing else delivers that without a server | A same-browser-only table (no link) does not let two people on different devices play; a hosted server breaks "no backend" and is outside this project's constraints |
| One public STUN address | Browsers behind home routers usually cannot find a path to each other without it | Going without it limits the room to players on the same local network |
