# Feature Specification: Booster Draft

**Feature Branch**: `008-booster-draft`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "Now we need a new tab, the tab is \"booster draft\" the idea is to open a bunch of boosters the draft works like this: on the top you have the fields: booster, ammount, cardpool (kept/total), grouping, and Button start draft. booster: (is autocomplete). ammount: number intput that can't be lower than 1. is the ammount of boosters to open. cardpool: is how many cards are showed simultaneously besides the number there is a kept/total calculation, if the booster has 9 and you have a pool of 3 you keep 3 per booster, so 12 boosters would be (36/108). grouping: shows what criteria is used to group the cards, (rarity, price, \"master duel rarity\", etc.). it should avoid repeating cards in a group. And the category of price is not perfect, so, the steps are: sort, form groups, shuffle groups. Show the cards to pick as the main focus of the page bellow a small flex display of the chosen cards, ordered alfabetically. Once the draft is finished you can add it to the backlog."

## Clarifications

### Session 2026-10-12

- Q: Should "Master Duel rarity" be included as a grouping option in this first version of Booster Draft, given the app has no existing source for that data? → A: Ship v1 with Rarity and Price only; add Master Duel rarity in a later feature once a data source is chosen.
- Q: Is the number of cards produced by opening a single booster always the same fixed number regardless of which set is selected, or can it vary by booster/set? → A: Varies per selected booster/set — the card count must be read from the selected booster, not assumed constant.
- Q: When sorting cards by approximate market price for grouping, how should a card with no available price data be placed? → A: Treat it as the lowest price, sorting alongside cheap/common cards.

### Session 2026-10-12 (follow-up, post-implementation)

- Clicking a card in the current pick group opens a detail view (image, type, level/rank, ATK/DEF)
  rather than immediately picking it; the detail view offers an explicit "Keep This Card" action.
- The compact kept-cards strip also serves as a drop target: dragging a card from the pick group
  onto it keeps that card, as an alternative to opening its detail view and confirming there.

### Session 2026-10-12 (follow-up #2, post-implementation)

- The card detail view includes the card's effect text (and, for Pendulum Monsters, separate
  Pendulum Effect / Monster Effect sections), shown only when that text exists.
- The card detail view shows additional fixed-value attributes (attribute, monster race or
  spell/trap property, level/rank, pendulum scale, link rating, link markers, archetype) as a
  flex-wrapped row of compact tags — each shown only when the card actually has that attribute
  (e.g., no "Level" tag for Link Monsters, no "Link Rating" tag for non-Link monsters).
- The booster autocomplete is restricted to a curated list of official, mainline TCG booster sets
  (the main numbered series from Legend of Blue Eyes White Dragon onward), excluding structure
  decks, starter/deck kits, tins, duelist/battle packs, and reprint-only blind-pack products —
  since the YGOPRODeck API has no field classifying a set's product line, this list is maintained
  by hand in `draft.js` and should be extended as new mainline boosters release.

### Session 2026-10-12 (follow-up #3, post-implementation)

- Each card shown in the pick display has a colored "glow" indicating its rarity, escalating
  through an ordered tier ladder (white → blue → yellow → red → further colors for the rarer
  secret/parallel tiers), with the single rarest regular tier (Starlight Rare) shown with an
  animated rainbow glow instead of one fixed color.
- The curated mainline-booster list, the rarity-glow color ladder, and the per-set booster-size
  override table are moved out of `draft.js` into a separate, isolated data file (`draft-data.js`)
  containing only reusable data tables, no behavior — loaded before `draft.js` on the page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure and run a booster draft (Priority: P1)

A user wants to simulate opening several boosters from a specific set and make a single pick from
each small batch of cards shown together, instead of keeping every card the boosters produce —
mimicking a real "draft" format.

**Why this priority**: This is the entire purpose of the feature. Without the ability to configure
and start a draft, nothing else in this feature has value.

**Independent Test**: Select a booster, set an amount and a cardpool size, choose a grouping
criterion, click "Start Draft," and confirm the first pick group of cards appears.

**Acceptance Scenarios**:

1. **Given** the Booster Draft tab is open and no draft is in progress, **When** the user selects a
   booster via the autocomplete field, enters an amount of 12 and a cardpool of 3 (for a booster
   with 9 cards), **Then** the page shows a live "36/108" kept/total calculation before the draft
   starts.
2. **Given** valid values are set for booster, amount, and cardpool, **When** the user clicks
   "Start Draft," **Then** the system opens the configured number of boosters and presents the
   first pick group (sized per the cardpool value) as the main focus of the page.
3. **Given** the amount field is empty or set to a value below 1, **When** the user attempts to
   start the draft, **Then** the system prevents starting and indicates the amount must be at
   least 1.
4. **Given** the cardpool value is greater than the number of cards contained in a single booster,
   **When** the user attempts to start the draft, **Then** the system prevents starting and
   indicates the cardpool must not exceed a booster's card count.

---

### User Story 2 - Pick one card from each presented group (Priority: P1)

While a draft is in progress, a user wants to choose exactly one card from each group of
simultaneously shown cards, see their picks accumulate, and move automatically to the next group
until the draft is complete.

**Why this priority**: This is the core interaction loop of a draft; without it, the feature does
not deliver a usable drafting experience beyond initial configuration.

**Independent Test**: With a draft started, click one card in the current pick group and confirm
it is added to the kept-cards list and a new pick group (or the finish state, if none remain) is
shown.

**Acceptance Scenarios**:

1. **Given** a pick group of cards is displayed as the main focus of the page, **When** the user
   opens a card's detail view and confirms "Keep This Card," or drags a card onto the kept-cards
   strip, **Then** that card is added to the small, alphabetically ordered list of chosen cards
   shown above the pick area, and the other cards in that group are discarded.
1a. **Given** a pick group of cards is displayed, **When** the user clicks (or activates via
   keyboard) a card without confirming "Keep This Card," **Then** only that card's detail view
   (image and available stats) opens — the card is not picked and the pick group is unchanged.
2. **Given** a card has just been picked and more pick groups remain, **When** the pick is
   confirmed, **Then** the next pick group is shown automatically without requiring any other
   action.
3. **Given** a pick group was formed from cards within one opened booster, **When** that group is
   displayed, **Then** it does not contain two cards with the same name unless that booster's
   opened cards offer no other distinct name to fill the group.
4. **Given** the chosen-cards list has accumulated multiple picks, **When** the user views it at
   any point during the draft, **Then** the cards are shown sorted alphabetically by name.

---

### User Story 3 - Finish the draft and add results to the backlog (Priority: P2)

Once every pick group has been resolved, a user wants to confirm their draft is complete and add
all of the cards they kept into their existing card backlog in one action.

**Why this priority**: This closes the loop between drafting and the rest of the collection
workflow, but the draft is still meaningfully usable (as a standalone exercise) even before this
step exists, so it is ordered after the core pick loop.

**Independent Test**: Complete every pick group of a draft, confirm a "finished" state appears with
an action to add the results to the backlog, trigger it, and confirm the backlog reflects the
drafted cards.

**Acceptance Scenarios**:

1. **Given** the last pick group of a draft has just been resolved, **When** no pick groups
   remain, **Then** the system marks the draft as finished and presents an action to add the kept
   cards to the backlog.
2. **Given** a finished draft with a kept-cards list, **When** the user adds the draft to the
   backlog, **Then** each kept card is merged into the backlog, increasing the owned quantity for
   cards the user already has and creating new backlog entries for cards they do not.
3. **Given** a draft has just been added to the backlog, **When** the user looks at the Booster
   Draft tab afterward, **Then** the tab is ready to configure and start a new, independent draft.

### Edge Cases

- What happens when the final group of an opened booster has fewer cards than the configured
  cardpool size (because the booster's card count does not divide evenly by the cardpool)? The
  user still picks one card from that smaller group.
- What happens when a booster's opened cards don't contain enough distinct card names to fill a
  group without repeats (e.g., many duplicate commons)? The group falls back to allowing a
  repeated name only when no distinct alternative remains, rather than blocking the draft.
- What happens if the user reloads the page or navigates away mid-draft? The in-progress draft
  (opened boosters, remaining pick groups, picks made so far) is not required to persist; the user
  may need to restart the draft from its configuration.
- What happens when grouping by approximate market price and a drawn card has no price data
  available? That card is treated as the lowest price for sorting purposes, so it sorts alongside
  cheap/common cards rather than causing an error or being excluded from a group.
- What happens if the user tries to change the booster, amount, cardpool, or grouping selection
  while a draft is already in progress? The system MUST prevent changing the draft's configuration
  mid-draft; the user must cancel/abandon the current draft (an explicit, confirmed action, since
  it discards picks already made) before configuring a new one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a "Booster Draft" page/tab, reachable the same way as the
  site's other tool pages, where users configure and run a draft.
- **FR-002**: Users MUST be able to choose exactly one booster/set for the draft via an
  autocomplete/typeahead field before starting; the field's choices MUST be restricted to official,
  mainline TCG booster sets (excluding structure decks, starter/deck kits, tins, duelist/battle
  packs, and reprint-only blind-pack products).
- **FR-011c**: Each card in the current pick group MUST display a visual "glow" indicating its
  rarity tier, using an ordered color ladder (white → blue → yellow → red → further colors for
  rarer tiers), with the single rarest regular TCG rarity shown with a distinct animated glow
  rather than a fixed color.
- **FR-019**: The curated mainline-booster list, the rarity-glow color ladder, and the per-set
  booster-size override table MUST be maintained in a dedicated, isolated file containing only
  reusable data tables (no behavior), loaded by the Booster Draft page before its behavior script.
- **FR-011b**: The card detail view (FR-011a) MUST include the card's effect text when it has one
  (for Pendulum Monsters, shown as separate Pendulum Effect and Monster Effect sections when both
  exist), and MUST display its other fixed-value attributes (attribute, race/property, level or
  rank, pendulum scale, link rating, link markers, archetype) as compact tags in a flex layout,
  showing only the attributes that card actually has.
- **FR-003**: Users MUST be able to specify the amount of boosters to open as a whole number; the
  system MUST reject or prevent starting a draft with an amount below 1.
- **FR-004**: Users MUST be able to specify a cardpool size: the number of cards shown together in
  each pick group. The system MUST reject or prevent starting a draft where the cardpool size is
  below 1 or greater than the number of cards produced by a single booster of the currently
  selected set (this count varies by booster/set and MUST be determined from the selection, not
  assumed constant).
- **FR-005**: Users MUST be able to choose a grouping criterion that determines how each opened
  booster's cards are sorted and bucketed into pick groups. Available criteria for this version
  are: card rarity and approximate market price. ("Master Duel" rarity is out of scope for this
  version — see Assumptions.)
- **FR-006**: Before the draft is started, the system MUST display a live calculation of how many
  cards will be kept out of how many total cards will be opened (e.g., "36/108"), updating as the
  amount and cardpool fields change.
- **FR-007**: Starting the draft MUST open the configured amount of the selected booster, each
  producing the number of cards that the selected set's booster normally yields (this count is
  specific to the selected set and used for the FR-004 and FR-006 calculations).
- **FR-008**: For each opened booster, the system MUST: (1) sort that booster's cards by the
  selected grouping criterion — when sorting by approximate market price, a card with no available
  price data MUST be treated as the lowest price and sorted alongside cheap/common cards — (2)
  partition the sorted cards into consecutive pick groups sized at the configured cardpool value
  (the final group within a booster may be smaller if the card count does not divide evenly), and
  (3) shuffle the order in which that booster's pick groups will be presented to the user.
- **FR-009**: A pick group MUST NOT contain more than one card with the same name unless the
  booster's opened cards offer no remaining distinct name to avoid the repeat.
- **FR-010**: For each pick group, the user MUST choose exactly one card to keep; the remaining
  cards in that group are discarded and do not become part of the draft's results. A card is kept
  either by confirming "Keep This Card" from its detail view (FR-011a) or by dragging it onto the
  kept-cards strip (FR-012a).
- **FR-011**: The system MUST display the current pick group as the primary visual focus of the
  page.
- **FR-011a**: Clicking (or otherwise activating) a card in the current pick group MUST open a
  detail view of that card (image and available stats) rather than immediately keeping it; the
  detail view MUST offer an explicit action to keep that card.
- **FR-012**: The system MUST display the cards kept so far in a compact strip positioned above the
  current pick group, sorted alphabetically by name, updated immediately after each pick.
- **FR-012a**: The kept-cards strip MUST also function as a drop target: dragging a card from the
  current pick group onto it keeps that card, equivalent to confirming "Keep This Card" from its
  detail view.
- **FR-013**: After a pick is made, the system MUST automatically advance to the next pick group
  (continuing through each opened booster's groups, across all opened boosters) until every pick
  group from every opened booster has been resolved.
- **FR-014**: Once every pick group has been resolved, the system MUST mark the draft as finished
  and present an explicit action to add the kept cards to the backlog.
- **FR-015**: Adding a finished draft to the backlog MUST merge each kept card into the existing
  backlog by name: incrementing the owned quantity for a card already in the backlog, or creating a
  new backlog entry for a card not already present.
- **FR-016**: The system MUST prevent starting a draft when no booster is selected, when the amount
  is invalid, or when the cardpool size is invalid (per FR-003 and FR-004).
- **FR-017**: The system MUST prevent changing the booster, amount, cardpool, or grouping selection
  while a draft is in progress; the user must explicitly cancel/abandon the in-progress draft
  (with confirmation, since this discards any picks already made) before starting a new one.
- **FR-018**: After a finished draft's cards are added to the backlog, the system MUST return the
  tab to its initial configuration state so a new draft can be set up.

### Key Entities

- **Booster Draft Session**: Represents one in-progress or finished draft. Attributes: selected
  booster/set, that set's per-booster card count, configured amount, configured cardpool size,
  selected grouping criterion, status (configuring, in progress, finished), the ordered sequence of
  opened boosters and their pick groups, and the accumulated list of kept cards.
- **Pick Group**: An ordered subset of one opened booster's cards, sized by the cardpool value,
  presented together so the user can choose one card to keep from it.
- **Kept Card**: A card the user has chosen from a pick group; contributes to the draft's final
  results and, once the draft is finished, to the quantity merged into the backlog.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can go from an empty draft configuration to seeing their first pick group in a
  single action (clicking "Start Draft"), with no additional setup steps required.
- **SC-002**: The kept/total calculation shown before a draft starts matches the actual number of
  picks the user ends up making and the actual number of cards opened, 100% of the time.
- **SC-003**: No pick group shown to the user during a draft contains two cards with identical
  names, except where a booster's opened cards leave no distinct alternative.
- **SC-004**: Users can add a finished draft's results to the backlog in a single action, and every
  kept card is reflected in the backlog's owned quantities immediately afterward.
- **SC-005**: At any point during a draft, users can see which cards they have already kept without
  leaving the pick screen.

## Assumptions

- A "booster" in this feature refers to the same real-world Card Set concept already used
  elsewhere in the app (e.g., the existing set/pack tools), opened via the same simulated-pack
  mechanism already established for the site. The number of cards a booster of a given set yields
  is determined by the selected set itself (it is not assumed to be the same constant for every
  set), and that count drives the cardpool upper bound (FR-004) and the kept/total calculation
  (FR-006).
- Only one booster/set may be selected per draft session; opening multiple different boosters in a
  single draft is out of scope for this feature.
- The grouping/pick-group formation described (sort, form groups, shuffle) is applied separately
  within each individual opened booster — a pick group never mixes cards from two different opened
  boosters. This matches the stated example where a 9-card booster with a cardpool of 3 yields
  exactly 3 kept cards "per booster."
- The two named grouping criteria (rarity and approximate market price) are the full set
  supported at launch. "Master Duel" rarity is explicitly out of scope for this version, since the
  app has no existing source for that data; it may be added in a future feature once a data source
  is chosen. The approximate-market-price criterion is understood to be an imperfect/best-effort
  grouping, consistent with how the user described it.
- An in-progress draft's state (opened boosters, remaining groups, picks made) does not need to
  survive a page reload or navigating away; it is scoped to the current visit to the tab, similar
  to other in-progress, not-yet-committed workflows already in the app.
- Adding a finished draft to the backlog is an all-or-nothing action covering every kept card in
  that draft; there is no requirement to add kept cards individually or to exclude specific kept
  cards from the backlog addition.
