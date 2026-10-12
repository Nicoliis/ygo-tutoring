# Quickstart: Validate Collapsible Sidebar Navigation

## Prerequisites

- No build step or server required — this is a static site.
- Serve the repo root with any static file server (or open the HTML files directly in a browser),
  e.g.:

  ```bash
  python3 -m http.server 8000
  ```

  then open `http://localhost:8000/index.html`.

## Scenario 1 — Navigate between all tools (User Story 1, SC-001, SC-003)

1. Open `index.html`. Confirm the sidebar lists all three tools and "Proxy Sheet Builder" is
   marked as the active entry ([data-model.md](./data-model.md) — Navigation Entry).
2. Click "Draft Collection Manager" in the sidebar → confirm you land on `collection.html` with
   that entry now marked active.
3. Click "Progression Series Pack Puller" → confirm you land on `tracker.html` with that entry
   marked active.
4. From `tracker.html`, click "Proxy Sheet Builder" → confirm you return to `index.html`.
5. Confirm no `&larr;`/`&rarr;` arrow links remain in any page's header (SC-005).

## Scenario 2 — Expand and collapse the sidebar (User Story 2, SC-002)

1. On any page, locate the sidebar's toggle control.
2. Activate it → confirm the sidebar collapses (to an icon rail on desktop widths, or fully
   closes as an overlay on narrow widths) and the main content area reflows to use the freed
   space, with no perceptible delay.
3. Activate the toggle again → confirm the sidebar re-expands to show full labels.
4. Reload the page → confirm the sidebar's last state (expanded or collapsed) is restored
   (FR-005, SC-004). Check browser DevTools → Application → Local Storage for the
   `ygoSidebarCollapsed` key to confirm persistence.

## Scenario 3 — Consistency across pages (User Story 3, SC-003, SC-004)

1. Collapse the sidebar on `index.html`.
2. Navigate to `collection.html` via the sidebar (while still in its collapsed/icon-rail state).
3. Confirm the sidebar on `collection.html` is also collapsed, and lists the identical three
   entries as on `index.html`.
4. Repeat for `tracker.html`.

## Scenario 4 — Narrow viewport behavior (Edge Case)

1. Resize the browser (or use DevTools device emulation) to a width at or below `640px`.
2. Reload a page with no prior stored preference (clear the `ygoSidebarCollapsed` localStorage
   key first) → confirm the sidebar defaults to collapsed.
3. Expand it → confirm it overlays the page content (rather than squeezing it into an unusably
   narrow column) and can be dismissed again without losing any in-progress input on the page
   underneath (e.g., text typed into a search box).

## Scenario 5 — Keyboard and accessibility spot-check (Constitution Principle I)

1. Using only the keyboard (Tab/Shift+Tab/Enter), reach the sidebar toggle button and activate it
   with Enter or Space.
2. Tab through the navigation links; confirm each has a visible focus indicator and the active
   page's link is announced/identifiable as current (`aria-current="page"`).
3. Confirm the toggle button's `aria-expanded` attribute flips between `"true"`/`"false"` as it is
   activated (inspect via DevTools Accessibility pane or the Elements panel).

## Expected outcome

All five scenarios pass with no console errors, no new network requests beyond existing
YGOPRODeck calls already made by each page's own script, and no regressions to each page's
existing functionality (search, deck building, collection management, pack tracking).
