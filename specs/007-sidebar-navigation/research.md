# Phase 0 Research: Collapsible Sidebar Navigation

All items from the feature spec had reasonable defaults available from the existing codebase
conventions; no items were left as `NEEDS CLARIFICATION` in `plan.md`. This document records the
key implementation-approach decisions made during planning.

## Decision 1: Shared navigation delivered as one injected JS module, not duplicated markup

**Decision**: Implement the sidebar as a single shared `nav.js` file that builds and inserts the
sidebar's DOM at runtime (and a single shared `nav.css`), included identically via `<script>`/
`<link>` tags on all three pages, rather than hand-writing the `<aside>` markup independently in
`index.html`, `collection.html`, and `tracker.html`.

**Rationale**: This project has no build step or server-side templating (Constitution Principle
III — Maintainability & Simplicity), so there is no "include" mechanism for static HTML partials.
The existing arrow-link navigation already demonstrates the failure mode of hand-duplicating nav
markup per page: `index.html`'s arrow only points to `collection.html`, never to `tracker.html`,
because the links were written independently per page and drifted. A single source of truth for
the link list (defined once in `nav.js`) removes that drift risk entirely and keeps the three
pages' markup minimal.

**Alternatives considered**:
- *Duplicate `<aside>` markup in each HTML file*: simplest to read per-file, but reproduces the
  exact drift risk the feature is meant to fix (FR-001/FR-003 require identical link sets across
  pages); rejected.
- *`<iframe>`-based shared nav*: avoids duplication but introduces its own document context,
  complicating active-link styling, keyboard focus order, and accessibility; disproportionate
  complexity for a 3-link list; rejected.
- *Light build step (e.g., a tiny script to concatenate an HTML partial at save-time)*: would
  violate Constitution Principle III ("no build step... unless justified"); rejected as
  unjustified for this scope.

## Decision 2: Persistence via a new `localStorage` key

**Decision**: Store the sidebar's expand/collapse state in `localStorage` under a new key
(`ygoSidebarCollapsed`), read once on page load (default: expanded on desktop-width viewports,
collapsed on narrow viewports per Decision 3) and written whenever the user toggles the sidebar.

**Rationale**: `app.js` already persists the deck to `localStorage` under `ygoDeck`, establishing
`localStorage` as this project's existing, build-free persistence mechanism (Constitution
"Additional Constraints": client-side only, local persistence). Reusing the same mechanism keeps
the new code consistent with project conventions and requires no new dependency.

**Alternatives considered**:
- *`sessionStorage`*: would not persist across the browser sessions implied by "remembers... on
  subsequent page loads" (FR-005); rejected.
- *Cookies*: adds HTTP header overhead and unneeded complexity (expiry handling) for a purely
  client-side preference; rejected.
- *No persistence, always default-open*: fails FR-005 and SC-004 directly; rejected.

## Decision 3: Responsive behavior and breakpoint

**Decision**: Default the sidebar to its collapsed state on viewports narrower than `640px` (only
before any stored preference exists), matching the mobile breakpoint already used in `style.css`
(`@media (max-width: 640px)`). On viewports at or below this breakpoint, an expanded sidebar is
rendered as an overlay above the page content (not pushing it) so it never permanently obscures
the tool the user is working in, per the spec's edge-case requirement (FR-007). Above the
breakpoint, the sidebar pushes content (reduces the main content's available width) when expanded
and shrinks to a narrow icon-only rail when collapsed (rather than disappearing entirely), so the
toggle control is always visible and reachable without hunting for it (FR-004, Assumptions).

**Rationale**: Reusing an existing breakpoint value keeps the new styles consistent with
`style.css`'s existing responsive behavior rather than introducing a second, divergent breakpoint
for the same class of device. A persistent icon rail (rather than a fully hidden sidebar) on
desktop guarantees FR-004's "always-reachable toggle control" without needing a separate
floating toggle button to reopen it.

**Alternatives considered**:
- *Fully hide (zero width) on collapse at all sizes*: requires a separate, always-visible
  floating toggle button outside the sidebar's own bounds, adding a second UI element to the
  layout; rejected in favor of the simpler icon-rail pattern.
- *Use the `900px` breakpoint from `collection.css`/`tracker.css` instead*: that breakpoint
  governs those pages' own two-column-to-one-column panel reflow, a different concern from
  sidebar-vs-content width; `640px` (true small/mobile-width) is the better match for "narrow
  viewport" in the spec's edge cases; chosen instead.

## Decision 4: Active-page detection

**Decision**: `nav.js` determines the active entry by comparing the current page's
`location.pathname` (last path segment) against each navigation entry's configured destination
filename, rather than requiring each HTML page to pass in or hardcode which entry is "active."

**Rationale**: Keeps `nav.js` fully generic and identical across all three pages (supporting
Decision 1), satisfying FR-002 and FR-008 (self-links are detected automatically and rendered as
non-interactive/current rather than needing per-page configuration).

**Alternatives considered**:
- *Each HTML page declares its own page identifier via a `data-` attribute consumed by `nav.js`*:
  workable, but adds one more per-page detail that could be copy-pasted incorrectly when adding a
  future page; comparing against `location.pathname` needs zero per-page configuration and is
  therefore less error-prone; chosen instead.
