<!--
Sync Impact Report
- Version change: 1.1.0 → 1.2.0 (MINOR: guidance materially expanded)
- Modified: Principle II (Minimal API Footprint) and the Additional Constraints now allow the offline copy
  (specs/021-installable-offline-app): the browser may fetch and keep the app's own static files and the pictures its
  pages already show, check the app's own files for a new version with conditional requests at start and when a window
  regains focus after 30 minutes (never on a timer), and keep card data and pictures in its Cache Storage. Kept card
  data and pictures lower the calls to the card database; nothing is sent anywhere new and saved data is never touched.
- Rationale: an installable app that works offline needs a copy of its own files and of the card data already seen.
- Earlier history: 1.1.0 added the Duel Room link; 1.0.0 was the initial ratification.

Earlier report (1.1.0)
- Version change: 1.0.0 → 1.1.0 (MINOR: guidance materially expanded)
- Modified: Principle II (Minimal API Footprint) and the Additional Constraints gain one exception, the Duel Room's
  player-to-player link (names and the duel table only, plus a public STUN lookup to find a path); no new calls to
  the card database, no polling, no backend.
- Rationale: the Duel Room (specs/018-duel-room) is a match between two people on two devices, which cannot be done
  without a direct link between them; no server of this project is introduced.
- Earlier history: 1.0.0 was the initial ratification.

Earlier report (1.0.0)
- Version change: (template, unratified) → 1.0.0
- Modified principles: n/a (initial ratification)
- Added sections:
  - Core Principles: I. Usability First, II. Minimal API Footprint, III. Maintainability & Simplicity
  - Additional Constraints
  - Development Workflow
  - Governance
- Removed sections: unused template placeholder slots for Principles 4-5 (project scoped to 3 principles per user input)
- Templates requiring updates:
  - .specify/templates/plan-template.md: ⚠ pending manual review (no update made by this command)
  - .specify/templates/spec-template.md: ⚠ pending manual review (no update made by this command)
  - .specify/templates/tasks-template.md: ⚠ pending manual review (no update made by this command)
  - .specify/templates/checklist-template.md: ⚠ pending manual review (no update made by this command)
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): original adoption date unknown prior to this amendment; set to the date this constitution was first authored (2026-10-06). Confirm or correct if an earlier date applies.
-->

# YGO Proxy Sheet Builder Constitution

## Core Principles

### I. Usability First
The app MUST remain immediately usable without instructions. Every user action that takes
more than an instant MUST give visible feedback (e.g. the `aria-live` search status region,
disabled/empty states for empty results). Interactive controls MUST be reachable and operable
via keyboard and MUST carry accessible names (`alt`, `aria-label`, `title`) for assistive
technology. Destructive actions (e.g. clearing the deck) MUST require explicit confirmation
before taking effect. Input friction MUST be minimized: sensible defaults, debounced input
handling, and a minimum input length MUST be enforced only where it prevents wasted work
(e.g. search), never to gate core functionality.
**Rationale**: This is a single-purpose tool used under time pressure (building a deck before
printing); any confusion or silent failure directly blocks the user's task.

### II. Minimal API Footprint
Calls to the external card API (YGOPRODeck) MUST be minimized and never redundant. The only other network
traffic allowed is the Duel Room's direct link between two players' browsers, which carries nothing but the
players' names and the duel table, and the public STUN lookup browsers use to find a path to each other; it uses
no server of this project and no polling. The browser's offline copy may also fetch and keep the app's own static files and the pictures its pages already show, and may check the app's own files for a new version with conditional requests when the app starts and when a window regains focus after at least 30 minutes, never on a timer; card data and pictures already seen are kept and reused so the card API is called less, not more. User input
that triggers a network request MUST be debounced (current standard: 400ms) and gated behind a
minimum query length (current standard: 3 characters). A new request superseding an in-flight
one MUST abort the stale request via `AbortController` rather than letting both resolve.
Data already held client-side (deck contents, last search results) MUST be reused from memory
or `localStorage` instead of being re-fetched. No feature may introduce polling, background
refresh, or speculative prefetching against the API without an explicit, documented need.
**Rationale**: The API is a free third-party service with no authentication; respecting it
keeps the tool reliable and avoids rate-limiting or service degradation for all users.

### III. Maintainability & Simplicity
The project MUST remain plain HTML/CSS/JavaScript with no build step, framework, or external
runtime dependency unless a dependency's complexity cost is explicitly justified against the
problem it solves. Code MUST stay organized by concern (persistence, search, deck, printing,
utilities, init — as already sectioned in `app.js`) using small, single-responsibility
functions. Dead code, unused abstractions, and speculative generalization MUST NOT be added;
three similar lines are preferred over a premature abstraction. Naming and structure MUST stay
consistent with the existing sectioned style so any future change is a small, local diff.
**Rationale**: A small static app has no CI/test suite as a safety net; simplicity and
consistency are what keep it safe to change by inspection alone.

## Additional Constraints

The app is client-side only: no backend, no build pipeline, and no server-side state. All
persistence is local to the browser (`localStorage`, and the browser's Cache Storage for the offline copy of the
app's files and the card data and pictures already seen); nothing is transmitted except the direct,
on-demand calls to the YGOPRODeck API described in Principle II and, in the Duel Room only, the player-to-player
link and public STUN lookup described there. Card data and imagery remain
attributed to YGOPRODeck in the UI (see footer) for as long as that API is used.

## Development Workflow

There is no automated test suite; changes MUST be manually exercised in a browser (search,
add/mark/unmark/remove cards, clear deck, print/save-as-PDF) before being considered complete.
Every change MUST be checked against the three Core Principles above: does it keep the UI
immediately understandable (I), does it avoid adding or duplicating API calls (II), and does it
keep the codebase small and consistent (III)? A change that trades one principle off against
another MUST state why in its description.

## Governance

This constitution supersedes ad-hoc practice for this project. Amendments are made by editing
this file directly, MUST update the version per the policy below, and MUST refresh the Sync
Impact Report at the top of the file.

Versioning policy (semantic versioning applied to governance):
- MAJOR: a principle is removed or redefined in a backward-incompatible way.
- MINOR: a new principle or section is added, or existing guidance is materially expanded.
- PATCH: wording, clarification, or typo fixes with no semantic change.

Every subsequent change to this repository (code review, feature work, or self-review when
working solo) MUST verify compliance with the Core Principles above; unjustified complexity or
scope creep MUST be flagged and either justified in writing or removed.

**Version**: 1.2.0 | **Ratified**: 2026-10-06 | **Last Amended**: 2026-10-23
