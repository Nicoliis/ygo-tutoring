# Feature Specification: Installable, Offline-Ready App

**Feature Branch**: `021-installable-offline-app`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Make the app installable and usable offline. The browser should offer 'Install app' (own window, app icon, name, theme colors) and, once installed or after the first visit, every screen of the app (profiles, menu, run, workshop, store, tools, duel room's own screens) must open without a connection using cached app files. Card data and card pictures from the card database still need the network the first time and are then cached for later use. The app must update itself: when a new version of the files exists, the user is told and can reload to get it, and never gets stuck on an old version. Saved data (profiles, collections, runs, save files) must never be touched or lost by installing, updating or clearing the app files cache. The duel room link (connection codes between two players) needs a connection and must say so clearly when offline instead of failing silently. Static site: no build step."

## Clarifications

### Session 2026-10-23

- Q: How much space may the app keep for card data and card pictures it has seen? → A: 150 MB; when it is full the oldest are dropped first.
- Q: Where does the app's own "Install app" button appear? → A: On the profile screen and the main menu only, while installing is possible; it is not shown inside the work screens.
- Q: What does the card database search do while offline? → A: It searches the card data kept from earlier visits and shows those matches labelled "offline results", and says plainly that the full database needs a connection.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Install the app (Priority: P1)

A user who opens the app in a supporting browser is offered an "Install app" option. After installing, the app opens in its own window with its own icon, name and theme colors, like a normal program, on desktop and on a phone.

**Why this priority**: It is the visible half of the request and the reason for the rest of the work.

**Independent Test**: Open the app in a supporting browser, install it, close the browser, start the installed app from the desktop or home screen, and confirm it opens in its own window with the app's icon, name and colors.

**Acceptance Scenarios**:

1. **Given** a supporting browser and a first or repeat visit, **When** the app is open, **Then** the browser can offer to install it, and the profile screen and the main menu also show the app's own "Install app" button while installation is available.
2. **Given** the user installs the app, **When** they start it from the system, **Then** it opens in its own window showing the app's name and icon, with the theme colors in the window frame.
3. **Given** the app is already installed, **When** the user opens it, **Then** the "Install app" button is not shown.
4. **Given** a browser that cannot install apps, **When** the user opens the app, **Then** the app works exactly as before and shows no install button.
5. **Given** the user dismisses the install offer, **When** they use the app, **Then** it does not nag them again during that visit.

---

### User Story 2 - Open every screen without a connection (Priority: P1)

After the first visit (or once installed), every screen of the app opens with no connection: profile selection, main menu, Run, Workshop, Store, Tools and the Duel Room's own screens. Cards, pictures and set information the user has already seen are available offline; things that were never loaded need a connection and say so.

**Why this priority**: Offline use is the main value of installing, for example for deck building away from home.

**Independent Test**: Visit every screen online once, turn the connection off, reload each screen, and confirm every one opens and works with the user's saved data.

**Acceptance Scenarios**:

1. **Given** the app was visited online once, **When** the user goes offline and opens any screen, **Then** the screen opens with the same look and behavior as online.
2. **Given** a card or its picture was shown before, **When** the user is offline, **Then** it is shown again from what was kept.
3. **Given** the user is offline and searches the card database, **When** the search runs, **Then** the app shows the matches among the cards kept from earlier visits, labelled "offline results", and says the full database needs a connection; with no match it says so instead of showing an empty or broken result.
4. **Given** the user is offline, **When** they try to open a pack from a set whose cards were never loaded, **Then** the app says that set needs a connection first and changes nothing in the run.
5. **Given** a first visit with no connection at all, **When** the app is opened, **Then** it cannot open (the browser shows its own offline page, because nothing has been kept yet); the install note and the offline page of later visits state that the first visit needs a connection to keep the app.

---

### User Story 3 - Updates arrive without getting stuck (Priority: P2)

When a new version of the app exists, the app tells the user and lets them reload to get it. The user is never stuck on an old version, and an update never interrupts what they are doing without asking.

**Why this priority**: Caching without an update path would freeze the app on its first version.

**Independent Test**: Publish a changed version, open the installed app, and confirm a notice offers to reload; reload and confirm the new version runs.

**Acceptance Scenarios**:

1. **Given** a new version exists, **When** the user opens or uses the app, **Then** it shows a notice that an update is ready with a "Reload" action.
2. **Given** the notice, **When** the user chooses Reload, **Then** the app restarts on the new version with everything intact.
3. **Given** the notice, **When** the user ignores it, **Then** their current work (a duel, a pack being opened) is not interrupted, and the new version is used the next time the app starts.
4. **Given** several windows of the app are open, **When** an update is applied, **Then** none is left running mixed old and new files.
5. **Given** the user has been away for a long time, **When** they open the app, **Then** they get the newest version within one reload and never stay on an outdated one.

---

### User Story 4 - Saved data is never touched (Priority: P1)

Installing, updating, or clearing the stored app files never changes, moves or deletes the user's saved data: profiles, collections, runs, filters, duel saves and the profile save files they chose.

**Why this priority**: Losing a collection would outweigh every benefit of the feature.

**Independent Test**: With saved profiles and a run, install, update and clear the app's cached files, and confirm all saved data is identical afterwards.

**Acceptance Scenarios**:

1. **Given** saved data, **When** the app is installed, **Then** the saved data is unchanged and available in the installed app.
2. **Given** saved data, **When** an update is applied, **Then** the saved data is unchanged.
3. **Given** saved data, **When** the stored app files are cleared or replaced, **Then** the saved data is unchanged and the app files are simply fetched again.
4. **Given** the user removes the cached app files but keeps the site data, **When** they open the app, **Then** their profiles and collections are still there.

---

### User Story 5 - Clear feedback about the connection (Priority: P2)

The user always knows whether a connection is needed. The app shows when it is offline, and every action that needs a connection says so clearly instead of failing silently. The Duel Room's link between two players, which needs a connection, explains this when offline.

**Why this priority**: Offline-ready only feels trustworthy if limits are explained, not hidden.

**Independent Test**: Go offline and try the card search, a pack from an unseen set, the Duel Room's link and importing set data; confirm each gives a clear message.

**Acceptance Scenarios**:

1. **Given** the connection drops, **When** the user is on any screen, **Then** a small indicator shows the app is offline, and disappears when the connection returns.
2. **Given** the user is offline, **When** they try to create or join a duel link, **Then** the Duel Room says a connection is needed and offers to retry, and practice alone still works.
3. **Given** the user is offline, **When** an action needs the card database, **Then** the message names what failed and what to do (reconnect and retry).
4. **Given** the connection returns, **When** the user retries, **Then** the action works without reloading the page.

### Edge Cases

- First visit with no connection: nothing is stored yet, so the app cannot open; once online the first visit keeps the app, and the install note and the offline page explain that the first visit needs a connection.
- An interrupted first load: a partially stored copy must never be used; the app falls back to loading normally and completes the copy later.
- The browser's storage is full or restricted (private window): the app keeps working online and says that offline use is unavailable.
- Two windows open during an update: both end on the same version.
- Card pictures and card data stored for offline use have a size limit: the oldest are dropped first, never the app files and never saved data.
- The app opened as a plain file from disk instead of from a web address: installing is not possible and the app explains it needs to be opened from its address.
- An update that fails to download: the old version keeps working and the update is retried later.
- Opening a screen address that was never stored while offline: the app shows its offline page with a way back to the menu.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST be installable from supporting browsers, with an app name, icon (several sizes including one for rounded system icons), start screen, display in its own window, and theme and background colors matching the app.
- **FR-002**: The app MUST show its own "Install app" button on the profile screen and the main menu while installation is available, and hide it once the app is installed or when the browser cannot install; the work screens do not show it.
- **FR-003**: After the first visit, every screen of the app (profile selection, main menu, all Run, Workshop, Store and Tools screens, and the Duel Room's own screens) MUST open without a connection.
- **FR-004**: Card data and card pictures from the card database MUST be kept after they are first loaded and reused offline, within a limit of 150 MB, removing the oldest first.
- **FR-004a**: While offline, the card database search MUST search the kept card data and show the matches labelled "offline results", and MUST say that the full database needs a connection.
- **FR-005**: The app MUST explain when something needs a connection (first visit, unseen card search, unseen set or pack, duel link) and MUST NOT change saved data when that action cannot run.
- **FR-006**: The app MUST show a visible offline indicator while there is no connection.
- **FR-007**: The app MUST detect that a newer version exists, tell the user, and offer a Reload action; it MUST NOT reload by itself while the user may be in the middle of a duel, a pack or an edit.
- **FR-008**: The app MUST never remain on an outdated version: a reload after an update MUST run the newest version, and open windows MUST NOT mix old and new files.
- **FR-009**: Installing, updating, and clearing or replacing the stored app files MUST NOT read, change, move or delete saved data (profiles, collections, runs, filters, duel saves, save files).
- **FR-010**: The Duel Room link MUST say clearly that it needs a connection when offline and offer to retry, while practice alone keeps working.
- **FR-011**: A partially stored copy of the app MUST never be used; an interrupted install or update MUST leave the previous complete copy in use.
- **FR-012**: When offline use is unavailable (storage blocked or full), the app MUST keep working online and tell the user offline use is off.
- **FR-013**: The app MUST stay a static site with no build step, and the list of files kept for offline use MUST be generated or checked so that no screen's files are left out.

### Key Entities

- **Installed app**: The app as the user's system sees it: name, icon, colors, window.
- **Offline copy**: The stored set of the app's files that lets every screen open without a connection, versioned as a whole.
- **Version**: One complete release of the app's files; the offline copy always holds exactly one complete version.
- **Kept card data**: Card information and pictures stored after first use, within a size limit.
- **Connection state**: Online or offline, shown to the user.
- **Saved data**: Everything the user created, kept separate from the app files.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can install the app in under 30 seconds on a supporting browser.
- **SC-002**: After one online visit, 100% of the app's screens open with the connection off.
- **SC-003**: An offline screen opens in under 2 seconds.
- **SC-004**: After a new version is published, 100% of users with the app open are told within one visit and reach the new version with one reload.
- **SC-005**: In every tested install, update and cache-clearing run, 0 saved profiles, collections or runs change or disappear.
- **SC-006**: Every action that needs a connection shows a clear message when offline in 100% of tested cases, with no silent failure.
- **SC-007**: Card data and pictures seen once are available offline in 100% of tested cases until the size limit removes them.

## Assumptions

- The app is served from a secure web address (or from the local development address); opening it as a file from disk cannot be installed.
- Not every browser can install apps; the app works as an ordinary site there.
- The first visit always needs a connection, because the files are stored during it.
- The offline limit for card data and pictures is 150 MB; saved data is never part of that limit.
- Packs can be opened offline only for sets whose card data was loaded before.
- The Duel Room's link keeps needing a connection; only its own screens, practice alone and viewing saved duels work offline.
- The app name, icons and colors follow the app's existing identity.
- Updating is checked whenever the app starts and while it stays open, and applied only when the user chooses to reload or on the next start.
