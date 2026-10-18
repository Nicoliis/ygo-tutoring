# Feature Specification: Progression Screens and Starting Set

**Feature Branch**: `017-progression-screens`

**Created**: 2026-10-18

**Status**: Draft

**Input**: User description: "At the start of a run, the user can choose the set (booster) where they start. The boosters appear in the same visual manner as they are now in the progression run. The progression run should be split into three screens. Screen 1: progression and the booster list. Screen 2: Current stage pull, where you can see everything you have pulled and what you are pulling; the \"see pulled\" list goes down there, in real time, sorted by rarity. Screen 3: Booster pull, where you have the boosters you can pull (bought or won) and their amount, shown by image and name like the boosters in the progression screen, but the ones you have none of are not there, you only see those you have."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose the set where my run starts (Priority: P1)

When the user starts a new run, before anything else, they see the booster list in the same look the progression screen uses (booster pictures with their names, in release order) and pick the set where the run begins. The run then starts at that set instead of always at the first one. The choice is made once per run.

**Why this priority**: It changes how every run begins and is needed before the screens are useful for a new profile.

**Independent Test**: Create a new Progression Run profile, open the run, pick the fifth set of the list, and confirm the run's current stage is that set and nothing earlier is part of the run.

**Acceptance Scenarios**:

1. **Given** a new Progression Run profile that has not started, **When** the user opens the run, **Then** they see the booster list as pictures with names, in release order, and are asked to choose the set where they start.
2. **Given** the booster list, **When** the user selects a set, **Then** the set is shown as selected and a confirmation asks them to start there; **When** they confirm, **Then** the run begins with that set as the current stage.
3. **Given** the user cancels at the confirmation, **When** they look at the list again, **Then** nothing has started and they can choose another set.
4. **Given** a run started at a chosen set, **When** the user views the booster list, **Then** the sets before the starting set are shown as not part of this run, and the sets from the starting set onward follow the usual states (opened, next, not reached).
5. **Given** a run that has already started, **When** the user opens the run, **Then** the starting-set choice is not offered again.
6. **Given** a profile whose run started before this feature existed, **When** the user opens the run, **Then** it continues exactly as before (it started at the first set) and no starting choice is shown.

---

### User Story 2 - Screen 1: progression and the booster list (Priority: P1)

The first screen of the run shows where the user stands: the run summary (profile, stage number, cards owned), the current stage with its actions (start the stage's box, complete the stage after its duel, build decks), the booster list in the usual look with each set's state, and the list of completed stages. It has no card pulling on it; to pull, the user goes to the next screens.

**Why this priority**: It is the home of the run and the place the other two screens hang from.

**Independent Test**: Open a run in progress: the screen shows the summary, the current stage and its actions, the booster list and completed stages, and shows no pack or pulled cards; each action still works.

**Acceptance Scenarios**:

1. **Given** a run in progress, **When** the user opens the progression screen, **Then** it shows the summary, the current stage with its actions, the booster list with each set's state, and the completed stages.
2. **Given** the stage's box has not started, **When** the user presses "Start box", **Then** the box starts and the user is taken to the current stage pull screen to begin pulling.
3. **Given** the box is finished, **When** the user presses "Complete stage", **Then** they choose whether they won or lost the duel and the stage completes as it does today.
4. **Given** the progression screen, **When** the user looks for the pulling area, **Then** there is none, but there are clear links to the current stage pull screen and the booster pull screen.
5. **Given** a finished run, **When** the user opens the progression screen, **Then** it says the run is finished and still shows the completed stages.

---

### User Story 3 - Screen 2: current stage pull (Priority: P1)

The second screen is where the stage's box is opened: the pack being pulled, the cards pulled from the current pack, and below them the "See pulled" list: every card pulled in this stage's box so far, shown in real time as each card is pulled, ordered by rarity (identical pulls grouped with their count). The user can open any card's details from it.

**Why this priority**: It is the heart of the run (opening the box) and the main thing the request asks to separate.

**Independent Test**: With a started box, pull five cards: each appears in the "See pulled" list at once, in rarity order, with identical cards grouped; leaving the screen and coming back keeps what was pulled.

**Acceptance Scenarios**:

1. **Given** a started box, **When** the user opens the current stage pull screen, **Then** they see the pack ready to pull, the cards already pulled from this pack, the box progress (pack x of 24, cards pulled) and below them the "See pulled" list of everything pulled in this stage.
2. **Given** the user pulls a card, **When** the card is revealed, **Then** it appears in the "See pulled" list immediately, without any button press, placed by rarity order.
3. **Given** two identical cards are pulled, **When** the list is shown, **Then** they are one entry with their count.
4. **Given** a card in the list or in the current pack's pulled cards, **When** the user selects it, **Then** its details open (with the engines panel).
5. **Given** the user leaves this screen mid-pack and returns, **When** the screen opens, **Then** the pack and the pulled lists are exactly as left.
6. **Given** the stage's box has not started, **When** the user opens this screen, **Then** it says so and offers a link back to the progression screen to start it.
7. **Given** the whole box has been pulled, **When** the screen is shown, **Then** it says the box is finished and points to the progression screen to complete the stage.

---

### User Story 4 - Screen 3: booster pull (Priority: P2)

The third screen is where the user opens the loose boosters they have (bought in the Store or won by losing a duel). It shows only the boosters the user has at least one of, in the same look as the booster list (picture and name), each with the amount available. Boosters with none are not shown. The user picks one to open and pulls its cards the same way as in the stage box.

**Why this priority**: It completes the split and gives bought and won boosters their own place, but the stage pull (P1) works without it.

**Independent Test**: With 5 packs of one set and 2 of another, open the screen: exactly those two sets appear with ×5 and ×2; open one, finish it, and confirm the amount drops and a set at zero disappears.

**Acceptance Scenarios**:

1. **Given** the user has bought and won boosters, **When** they open the booster pull screen, **Then** they see only the sets they have at least one pack of, each with its picture, name and amount.
2. **Given** the user has no boosters, **When** they open the screen, **Then** it says there are none and links to the Store.
3. **Given** a listed booster, **When** the user opens one, **Then** its pack is shown to pull, one card at a time, as in the stage box, and the amount drops by one.
4. **Given** the last pack of a set is opened and finished, **When** the list is shown again, **Then** that set is no longer there.
5. **Given** a pack is open, **When** the user leaves the screen and returns, **Then** the same pack is waiting where they left it and no other pack can be opened until it is finished.
6. **Given** the pack is open, **When** the user looks at the screen, **Then** the cards pulled from it are shown, in real time sorted by rarity, as on the stage pull screen.

---

### User Story 5 - Move between the three screens (Priority: P2)

The three screens are reachable from the run's navigation and from each other: the Run section of the app's sidebar lists them in order, and the progression screen links to the other two. The user never loses a started pack by moving between screens.

**Why this priority**: Needed so the split is usable, but depends on the screens themselves.

**Independent Test**: From the progression screen go to the stage pull, pull two cards, go to the booster pull and back: the stage pack and its pulled cards are as left.

**Acceptance Scenarios**:

1. **Given** any run screen, **When** the user looks at the sidebar, **Then** the three screens appear in order (progression, current stage pull, booster pull) with the open one marked.
2. **Given** a pack is open on one pull screen, **When** the user opens the other pull screen, **Then** the open pack stays safe and untouched; opening a different pack is only possible after finishing the open one (the same rule as today).
3. **Given** a profile with no run rules (Sandbox), **When** the user opens any of the three screens, **Then** they see the same "no run rules" explanation as today.

---

### Edge Cases

- A new run at the very last set of the list: it starts there; the run is one stage long.
- The user closes the page between choosing the set and confirming: nothing has started and the choice is offered again.
- A starting set whose picture is missing: the usual named placeholder is shown, as in the booster list today.
- A started run where the user leaves a pack open on the stage screen and opens the booster screen: both screens show the same open pack state, with no way to open two packs at once.
- Very many different boosters in the booster screen (all sets): the list wraps like the progression booster list; none is cut off.
- A bought pack opened while the stage box is finished or not started: allowed (loose boosters are independent of the stage box), as today.
- The "See pulled" list for a large box (up to 216 cards): stays responsive; updating after each pull does not reload the whole screen.
- Returning to a pull screen after finishing a pack elsewhere: it shows the fresh state, never stale cards.
- Store purchases made while a run screen is open in another tab: the booster pull screen shows current amounts when it is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A new Progression Run MUST ask the user to choose the starting set before the run begins, from the booster list shown in the same visual style as the progression screen's booster list (picture and name, in release order).
- **FR-002**: The choice MUST be confirmed before the run starts, MUST be possible to cancel, and MUST be made once: a started run never offers it again.
- **FR-003**: The run MUST begin with the chosen set as its current stage; sets before it MUST NOT be part of the run (they are shown as not part of it, cannot be completed and are not available to buy), and stage progression continues in list order from the chosen set.
- **FR-004**: Runs that started before this feature MUST continue unchanged, as if they had started at the first set.
- **FR-005**: The run MUST be split into three screens: Progression, Current stage pull and Booster pull, each its own page in the Run section of the navigation, listed in that order.
- **FR-006**: The Progression screen MUST show the run summary, the current stage and its actions (start box, complete stage after choosing the duel result, build decks), the booster list with each set's state, and the completed stages, and MUST NOT show any pack or pulled-card area.
- **FR-007**: Starting the stage's box MUST take the user to the Current stage pull screen.
- **FR-008**: The Current stage pull screen MUST show the pack being pulled, the cards pulled from the current pack, the box progress and, below them, the "See pulled" list of every card pulled in the stage's box.
- **FR-009**: The "See pulled" list MUST update in real time as each card is revealed, with no extra action, MUST be ordered by rarity (rarest first), and MUST group identical pulls with their count.
- **FR-010**: Cards in either list MUST open their details window (including the engines panel) when selected.
- **FR-011**: The Current stage pull screen MUST explain when the box has not started or is finished and link to the Progression screen.
- **FR-012**: The Booster pull screen MUST list only the loose boosters (bought or won) the user has at least one of, each with its picture, name and amount, in the same visual style as the booster list; boosters with none MUST NOT appear.
- **FR-013**: The Booster pull screen MUST let the user open one booster at a time with the same one-card-at-a-time pull as the stage box, MUST show the cards pulled from it in real time sorted by rarity, and MUST reduce the amount when a pack is opened.
- **FR-014**: When the user has no loose boosters the Booster pull screen MUST say so and link to the Store.
- **FR-015**: An open pack and its pulled cards MUST survive leaving a screen, switching between the two pull screens and closing the page; only one pack (stage or loose) can be open at a time, as today.
- **FR-016**: Everything already working with pulls MUST keep working on the new screens: card details with the engines panel (including saving a pulled copy early), the saved-early rule, duel rewards on completing a stage, and saving the pulled cards to the Backlog when a pack finishes.
- **FR-017**: Profiles without run rules MUST see the "no run rules" message on each of the three screens.
- **FR-018**: Every screen MUST be keyboard operable with accessible names, and usable at phone width without sideways scrolling.

### Key Entities

- **Run**: A profile's Progression Run: the starting set, completed stages, current stage, the stage's box (packs opened, current pack, pulled cards), the loose-booster inventory and an open loose pack (existing data, plus the starting set).
- **Starting set**: The set the run began at; sets before it are outside the run.
- **Stage box**: The 24 packs of the current stage and everything pulled from them.
- **Loose booster**: A pack bought in the Store or won by losing a duel, with the number of packs the user has of each set.
- **Pulled list ("See pulled")**: The cards pulled so far in the stage box, grouped when identical and ordered by rarity.
- **Run screen**: One of Progression, Current stage pull and Booster pull.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can start a run at a set of their choice in at most 3 actions (open the run, pick a set, confirm).
- **SC-002**: 100% of runs that started before this feature continue at the same stage with the same data and no starting-set prompt.
- **SC-003**: After a card is pulled it appears in the "See pulled" list in under 0.5 seconds with no action, in 100% of pulls, in rarity order with identical cards grouped.
- **SC-004**: The Booster pull screen shows only boosters with an amount of 1 or more: 0 zero-amount boosters are ever listed, and every listed amount equals the user's inventory.
- **SC-005**: Moving between the three screens never loses or duplicates a pulled card or an open pack (0 cases over 20 round trips with a pack open).
- **SC-006**: Everything a user could do on the old single screen (start box, pull, open loose boosters, complete a stage, build decks, view pulled cards) is still possible: 100% of those tasks can be done across the three screens.
- **SC-007**: All three screens are fully usable at phone width without sideways scrolling and by keyboard alone.

## Assumptions

- The three screens are three pages under the existing Run area of the navigation: Progression Run (screen 1), Current Stage Pull (screen 2) and Booster Pull (screen 3).
- The starting-set choice appears on the Progression screen for a run that has not started; once confirmed, the run is created at that set.
- Sets before the starting set are outside the run: not part of the stage order, not completable, not available in the Store; later sets follow the booster list order as today.
- The starting choice cannot be changed afterwards (no "restart at another set" in this feature).
- "See pulled" on the stage screen lists the cards of the stage's box (all packs of the stage so far), and on the booster screen the cards of the open loose pack, both ordered rarest first.
- The "See pulled" list is part of the page below the pack (not a separate window or a button), as requested.
- The booster picture and name look reuses the progression booster list's look; on the booster screen the amount is shown on each booster.
- Loose boosters come from the Store (bought) and from lost duels; no other source is introduced here.
- Opening a loose booster does not depend on the stage box being started or finished.
- Existing behaviours (details window with engines panel, saved-early pulls, duel rewards, saving pulls to the Backlog) are unchanged and simply reachable from the new screens.
