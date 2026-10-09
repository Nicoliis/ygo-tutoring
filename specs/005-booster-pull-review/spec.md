# Feature Specification: Booster Pull Review

**Feature Branch**: `005-booster-pull-review`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "In the booster-opening. Once the pull is made you can: \"save\",
\"reattempt\", \"discard\". And onces the pull is made you can see them in \"minicard that can be
clicked for more detail\" form."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review a simulated pull before committing it (Priority: P1)

A user simulating a booster pull (the Set Pack Simulator's "Simulate pull" control) wants to see
exactly what was drawn before it becomes part of their backlog, and wants the freedom to throw
away a draw they don't like and try again — instead of the draw being added to their backlog and
recorded the instant it's generated, as happens today.

**Why this priority**: This is the foundational behavior change everything else in this feature
builds on — there's nothing to show as minicards, and nothing to decide between, until a drawn
pull is held back for review instead of auto-committing.

**Independent Test**: Can be fully tested by simulating a pull, confirming nothing is yet added to
the backlog or recorded as a completed pull, then separately testing that Save commits it, Discard
throws it away, and Reattempt replaces it with a fresh draw — all without touching any database
lookup.

**Acceptance Scenarios**:

1. **Given** a tracker with a set selected, **When** the user simulates a pull, **Then** the drawn
   cards are shown for review and are not yet added to the backlog or recorded as a completed
   pull.
2. **Given** a pending pull review, **When** the user chooses Save, **Then** every drawn card is
   added to the backlog and the pull is recorded as completed, exactly as today's immediate
   behavior already does it.
3. **Given** a pending pull review, **When** the user chooses Discard, **Then** nothing is added
   to the backlog, nothing is recorded, and the review is cleared.
4. **Given** a pending pull review, **When** the user chooses Reattempt, **Then** the current draw
   is thrown away and a brand-new simulated draw — using the same set and pack count as the
   discarded one — is shown for review in its place.
5. **Given** a pending pull review already open for a tracker, **When** the user tries to start
   another simulated pull for that same tracker, **Then** they cannot do so until the current
   pending pull is saved, reattempted, or discarded.

---

### User Story 2 - Inspect a pulled card's details from its minicard (Priority: P2)

A user looking at the cards they just pulled wants to click any one of them to see more about it
— its image and the handful of details that matter — without that click accidentally committing
or discarding the whole pull.

**Why this priority**: Valuable on its own, and depends on Story 1's review step existing (there's
nothing to click into detail on before a pull is held back for review), so it's the natural
second-priority enhancement.

**Independent Test**: Can be fully tested by simulating a pull and clicking any one of the
resulting minicards, confirming its detail view appears and that doing so has no effect on the
pending Save/Reattempt/Discard decision.

**Acceptance Scenarios**:

1. **Given** a pending pull's minicards, **When** the user clicks one, **Then** that card's
   additional details (its image, and type/level/ATK/DEF when it's a Monster) are shown.
2. **Given** a pulled card with no database match or image available, **When** the user clicks its
   minicard, **Then** a graceful fallback is shown instead of an error or a blank view.

---

### Edge Cases

- What happens if the user changes the (page-wide) selected set while a pull is still pending
  review for some tracker? (resolved — see Assumptions: the pending pull remembers its own set and
  pack count from when it was drawn, independent of later set-selector changes.)
- What happens if the user deletes a tracker that has a pending, unsaved pull? The pending pull is
  simply discarded along with it — there is nothing to save once the tracker it belonged to is
  gone.
- What happens when a reattempted draw happens to be identical to the one it replaced? Nothing
  special — it's still a fresh, independent random draw; the pending review simply updates with
  its (possibly coincidentally identical) results.
- What happens if the card database is unreachable when the user first clicks "Simulate pull"?
  Unchanged from today's existing fail-safe behavior — a clear error is shown and no review ever
  begins.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Completing a simulated pull MUST NOT immediately add any card to the backlog or
  record the pull as completed. Instead, the drawn cards MUST be held as a pending review until
  the user explicitly decides what to do with them.
- **FR-002**: Each card in a pending pull review MUST be shown in a compact "minicard" form
  showing that card's image — falling back to showing its name as text when no image is available
  — with the card's name always available as the minicard's accessible name (for screen readers
  and as a hover title) regardless of whether an image is shown.
- **FR-010**: Minicards in a pending pull review MUST be displayed sorted alphabetically by card
  name, regardless of which pack each card was drawn into. This sorting is display-only — it MUST
  NOT change the per-pack grouping Save relies on to record one completed pull per pack.
- **FR-003**: While a pull is pending review, the user MUST be able to choose exactly one of three
  actions: **Save** (commit the pull), **Reattempt** (discard the draw and immediately perform a
  new one with the same parameters), or **Discard** (abandon the draw entirely).
- **FR-004**: Choosing Save MUST add every card in the pending pull to the backlog (using the
  existing merge-by-name rule) and MUST record the pull as completed, with exactly the same effect
  on the backlog and on tracker progress tracking that today's immediate-commit behavior has.
- **FR-005**: Choosing Discard MUST add nothing to the backlog and MUST NOT record the pull; the
  pending review is cleared with no further effect.
- **FR-006**: Choosing Reattempt MUST discard the current draw (with no effect on the backlog,
  same as Discard) and MUST immediately perform a new, independently random simulated draw using
  the same set and pack count as the discarded one, replacing the pending review in place.
- **FR-007**: While a tracker has a pending pull review, starting another simulated pull for that
  same tracker MUST NOT be possible until the current one is saved, reattempted, or discarded.
- **FR-008**: Clicking a pending pull's minicard MUST show that specific card's additional details
  — its image, and for a Monster-type card, level/rank and ATK/DEF — sourced from the same
  external card database lookup already used to build the set's draw pool, without introducing
  any additional network call.
- **FR-009**: A pulled card with no available image or database detail MUST still show a graceful
  fallback in its detail view rather than an error or a blank view.

### Key Entities

- **Pending Pull**: A simulated draw that has not yet been saved or discarded. Belongs to exactly
  one tracker (a tracker has at most one pending pull at a time); remembers the set name and pack
  count it was drawn with (so Reattempt repeats those exact parameters even if the page's selected
  set changes afterward) and the full list of drawn cards. Exists only for the current session —
  it is not written to persistent storage.
- **Pulled Card**: One card within a pending pull — its name, plus whatever database details
  (type, level, ATK/DEF, image) were already looked up to build the set's draw pool, shown via its
  minicard and detail view.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can see every card from a simulated pull before any of it reaches their
  backlog, and can discard the entire draw with zero cards added.
- **SC-002**: A user can see a specific pulled card's image and key details with a single click,
  without leaving the pending review.
- **SC-003**: Reattempting produces a new draw immediately, with no need to re-select the set or
  re-enter the pack count.
- **SC-004**: Saving a reviewed pull has exactly the same effect on the backlog and on tracker
  progress as the pre-existing immediate-commit behavior — zero regression for users who always
  save.
- **SC-005**: 100% of simulated pulls go through this review — none are added to the backlog
  without an explicit Save.

## Assumptions

- Scope is the Set Pack Simulator's "Simulate pull" flow in `tracker.js`. The separate, manual
  "Log pull" free-text flow (typing card names you already pulled in real life) is unaffected and
  keeps its current immediate behavior — there is no randomness there to review or reattempt.
- "More detail" on a minicard reuses the same external card-database lookup already performed to
  build the set's draw pool (established by the Set Pack Simulator and Card Tag Interactions
  features) — no new network call is introduced by this feature.
- A minicard's detail view is a single click-to-open action, not the hover/expand/second-click
  progression used for backlog/engine/deck cards in the Card Tag Interactions feature — this is a
  lighter-weight, one-step inspection need, distinct from that browsing-focused interaction.
- Discarding or reattempting a pending pull needs no extra confirmation step, since nothing has
  been persisted yet — unlike the Card Tag Interactions feature's removal-confirmation
  requirement, which applies to removing something already saved.
- Pending-pull state is session-only; reloading the page while a pull is pending loses that
  unsaved review, consistent with how other in-progress, not-yet-saved actions in this app behave.
