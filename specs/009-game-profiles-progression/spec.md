# Feature Specification: Game Profiles & Progression Mode

**Feature Branch**: `009-game-profiles-progression`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Let's add some 'game' elements to this. 1- when entering you choose your profile. 2- each profile will be a 'run' in one of several different game modes. 3- the first game mode is 'progression'. The progression game: starts with an empty backlog; you pull one 'box' of each main booster in ascending order; then you deckbuild with that and you duel; then you move to the date of the next booster."

## Clarifications

### Session 2026-10-16

- Q: What happens to existing saved collection, decks and backlog when profiles are introduced? → A: They are imported into a profile named "Sandbox" that has no run rules (free play).
- Q: What counts as one box? → A: 24 packs, using each set's own pack size and rarity odds (existing size overrides apply).
- Q: Can stages be undone after advancing? → A: No undo; opening a box and advancing are final. 
- Q: What is the new mode called in the UI, given the existing "Progression Series Pack Puller" tool? → A: The mode is labelled "Progression Run" in the UI (nav entry, page title, mode selector); "Progression Series" keeps meaning the existing real-world pack tracker.
- Q: What happens when a booster is added to the list after a run has already finished? → A: A finished run stays finished (no undo/reopen); only in-progress runs pick up new boosters.
- Q: Can the user open boosters beyond the current stage's box in a Progression profile? → A: Yes, any set may be opened freely; only the stage's single box is tracked for advancing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose or create a profile on entry (Priority: P1)

When the user opens the app they are asked which profile to play. They can pick an existing profile or create a new one by giving it a name and choosing a game mode. Everything they do afterwards (collection, decks, backlog, progress) belongs to that profile and is separate from every other profile.

**Why this priority**: Profiles are the foundation of the whole feature; no game mode can exist without a place to keep its run.

**Independent Test**: Create two profiles, add different cards to each, switch between them, and confirm each shows only its own data.

**Acceptance Scenarios**:

1. **Given** no profiles exist, **When** the user opens the app, **Then** they are prompted to create their first profile (name + game mode).
2. **Given** several profiles exist, **When** the user opens the app, **Then** they see all profiles with name, mode and a short progress summary, and can select one.
3. **Given** a profile is active, **When** the user switches profile, **Then** every page shows only the selected profile's data.
4. **Given** a profile exists, **When** the user renames or deletes it (with explicit confirmation), **Then** only that profile is affected.

---

### User Story 2 - Start a Progression run and open the first boosters (Priority: P1)

A profile in Progression mode starts with an empty backlog and its position at the earliest main booster. The user opens one box of that booster (a full box worth of packs), and all pulled cards land in the profile's backlog.

**Why this priority**: This is the core loop of the first game mode and delivers the "start from nothing" experience.

**Independent Test**: Create a Progression profile, confirm the backlog is empty, open the first booster's box, and confirm the pulled cards appear in the backlog.

**Acceptance Scenarios**:

1. **Given** a new Progression profile, **When** the user views its backlog, **Then** it is empty and the current stage is the first main booster.
2. **Given** the current stage booster, **When** the user opens its box, **Then** a full box of packs is opened and every card is added to the backlog.
3. **Given** the box for the current stage was already opened, **When** the user tries to open it again, **Then** the app prevents it and explains that the stage's box is already opened.

---

### User Story 3 - Deckbuild, duel, and advance to the next booster (Priority: P1)

After opening the stage's box, the user builds decks from the accumulated backlog and plays their duels outside the app. When ready, they mark the stage as complete and the run advances to the next main booster in release order, making that booster's box available to open.

**Why this priority**: Advancing is what turns a collection tool into a progression game.

**Independent Test**: Open a box, build a deck from the backlog, mark the stage complete, and confirm the next booster becomes the current stage while the backlog and decks are kept.

**Acceptance Scenarios**:

1. **Given** the stage's box is opened, **When** the user marks the stage complete, **Then** the next main booster in ascending release order becomes the current stage.
2. **Given** the stage's box has not been opened, **When** the user tries to advance, **Then** the app blocks it and tells them the box must be opened first.
3. **Given** the user advances, **When** they review their backlog and decks, **Then** all earlier cards and decks are preserved and new pulls add on top.
4. **Given** the last main booster stage is completed, **When** the user advances, **Then** the run is shown as finished.

---

### User Story 4 - See run progress and history (Priority: P2)

The user can see where the run stands: current stage and its release date, boosters already completed, boosters remaining, and how many cards they own.

**Why this priority**: Gives the sense of progression and lets users resume a run after time away.

**Independent Test**: Advance through two stages and confirm the progress view lists them as completed with the current and remaining stages correct.

**Acceptance Scenarios**:

1. **Given** a run in progress, **When** the user opens the run overview, **Then** they see completed, current and remaining stages in release order.
2. **Given** the user returns later, **When** they select the profile, **Then** the run resumes exactly where it was left.

---

### User Story 5 - Keep existing data and allow future game modes (Priority: P3)

Data the user saved before this feature is not lost. The profile system treats "game mode" as a selectable property so more modes can be added later without changing how profiles work; Progression is the only mode available now.

**Why this priority**: Protects existing users' collections and avoids rework when the second mode is added.

**Independent Test**: With pre-existing collection data in the browser, open the app after the update and confirm the data is still reachable.

**Acceptance Scenarios**:

1. **Given** collection data saved before this feature, **When** the user first opens the app afterwards, **Then** that data is available in a profile named "Sandbox" with no run rules (free play).
2. **Given** the mode selector at profile creation, **When** it is shown, **Then** Progression is the only mode offered for new runs and the structure allows additional modes later.

### Edge Cases

- User tries to create a profile with an empty or duplicate name: the app asks for a valid unique name.
- User deletes the active profile: confirmation is required, and afterwards they return to profile selection.
- Browser storage is full or unavailable: the user is told their progress could not be saved.
- A new main booster is added to the booster list after a run started: an in-progress run picks it up in its list position, never skipping or reordering stages already completed. A run that already finished stays finished.
- User accidentally advances or opens the stage box: there is no undo, so the action asks for confirmation first.
- User closes the app mid-stage (box opened, not yet advanced): the stage state is restored on return.
- Booster pull data cannot be fetched (offline): box opening fails visibly without marking the box as opened.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On entry, the system MUST present profile selection before any game content, showing existing profiles and an option to create a new one.
- **FR-002**: Users MUST be able to create a profile by providing a unique name and a game mode.
- **FR-003**: Users MUST be able to rename and delete profiles; deletion MUST require explicit confirmation.
- **FR-004**: Each profile MUST keep its own independent data (collection, including its backlog and decks, plus run progress); changes in one profile MUST NOT affect another.
- **FR-005**: The system MUST remember the last-used profile and allow switching profile at any time from any page.
- **FR-006**: A Progression profile MUST start with an empty backlog and its current stage set to the earliest main booster.
- **FR-007**: Progression stages MUST follow the main booster list in ascending release-date order.
- **FR-008**: For the current stage, users MUST be able to open one box of that booster, adding every pulled card to the profile's backlog.
- **FR-009**: Each stage MUST allow its box to be opened only once per run. A box is 24 packs, using the set's own pack size and rarity odds.
- **FR-009a**: Opening boosters beyond the stage's box (any set) MUST remain possible and add to the backlog; only the stage's box counts toward advancing.
- **FR-009b**: Opening a stage's box and advancing a stage MUST be final; no undo of either.
- **FR-010**: Users MUST be able to build decks from the profile's backlog at any point in the run, using the existing deckbuilding features.
- **FR-011**: Users MUST be able to mark the current stage complete only after its box was opened, which advances the run to the next booster by release date.
- **FR-012**: Advancing a stage MUST preserve the backlog and all decks.
- **FR-013**: The system MUST show run progress: completed, current and remaining stages with release dates, plus card totals. On the profile picker each Progression profile shows a one-line summary in the form "Stage 12/140 – Box opened" (or "Box not opened", or "Finished").
- **FR-013a**: Opening the Progression Run page with a profile that has no run rules (e.g. Sandbox) MUST show a message saying so and links to the other tools, not an error.
- **FR-014**: The system MUST show the run as finished after the final main booster stage is completed.
- **FR-015**: Run state MUST persist across sessions and be included in the app's save/export/import so no run data is ever lost.
- **FR-016**: Data saved before this feature MUST remain accessible after the update, inside a "Sandbox" profile that has no run rules (free play).
- **FR-017**: Game mode MUST be a property of a profile such that additional modes can be introduced later without altering existing profiles.

### Key Entities

- **Profile**: A named player run. Has a unique name, a game mode, creation date, and owns all of its data.
- **Game Mode**: The ruleset a profile follows. "Progression" is the only selectable mode; the migrated "Sandbox" profile has no run rules.
- **Run (Progression state)**: The profile's position in the booster timeline: ordered stages, which are completed, which is current, whether the current box is opened.
- **Stage**: One main booster in release order, with its release date and box-opened / completed status.
- **Backlog**: The profile's accumulated pulled cards available for deckbuilding.
- **Deck**: A deck built from the profile's backlog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can create a profile and reach the first box opening in under 1 minute.
- **SC-002**: A user can resume any profile and see their exact stage and data in under 5 seconds after entering.
- **SC-003**: With two profiles, 100% of changes made in one are absent from the other.
- **SC-004**: A user can complete a full stage cycle (open box, build a deck, advance) without leaving the app or needing instructions.
- **SC-005**: 100% of attempts to open a stage's box twice, or to advance before opening it, are blocked with a clear explanation.
- **SC-006**: Zero loss of pre-existing saved data after the update.

## Assumptions

- "Main booster" refers to the app's existing hand-maintained mainline booster list; its order gives the stage order, and the first stage is the earliest booster in it.
- Duels are played outside the app; the app does not simulate or record duels, so "complete stage" is a manual user action.
- Profiles are local to the browser; no accounts, sync or sharing.
- Existing booster opening and deckbuilding features are reused rather than redefined.
- Progression is the only mode in scope; other modes are out of scope for this feature.
- The "Sandbox" profile is created only when pre-existing saved data is found; users with no prior data start at an empty picker and create their first profile.
- In the UI the mode is shown as "Progression Run"; it is unrelated to the existing "Progression Series Pack Puller" tool.
