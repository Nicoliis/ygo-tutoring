# Feature Specification: Collapsible Sidebar Navigation

**Feature Branch**: `007-sidebar-navigation`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "We should have a sidebar to access all parts of the page instead of using the arrows. The sidebar should expand and hide."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate between tools via sidebar (Priority: P1)

A user working in any one of the site's tools (Proxy Sheet Builder, Draft Collection Manager, Progression Series Pack Puller) wants to jump to any other tool directly, without having to remember which "next/previous" arrow link currently points where.

**Why this priority**: This replaces the existing arrow-link navigation, which only exposes one neighboring page at a time and requires multiple clicks to reach a non-adjacent tool. This is the core value of the feature and the minimum needed to replace the old navigation.

**Independent Test**: From any page, open the sidebar and click each of the other tool entries; confirm each click navigates to the correct page and the current page is visually indicated as active.

**Acceptance Scenarios**:

1. **Given** a user is on any tool page, **When** they open the sidebar, **Then** they see a list of all available tools/pages, with the current page clearly marked as active.
2. **Given** the sidebar is open, **When** the user clicks a link for a different tool, **Then** the browser navigates to that tool's page.
3. **Given** a user is on a tool page, **When** the page first loads, **Then** the sidebar entry for that page is marked as the current/active one.

---

### User Story 2 - Expand and collapse the sidebar (Priority: P1)

A user wants to hide the sidebar to reclaim screen space while working, and bring it back when they need to navigate elsewhere.

**Why this priority**: The user explicitly requested that the sidebar "expand and hide" — this toggle behavior is a core requirement, not an enhancement, since the tools are content-dense and screen space matters.

**Independent Test**: Toggle the sidebar closed, confirm the main content area reflows to use the freed space and the sidebar is no longer visible (or is reduced to a minimal collapsed strip); toggle it open again and confirm it returns to its full, expanded state.

**Acceptance Scenarios**:

1. **Given** the sidebar is expanded, **When** the user activates the collapse control, **Then** the sidebar hides (or shrinks to a compact strip showing only a toggle/icons) and the main content area expands to use the reclaimed space.
2. **Given** the sidebar is collapsed, **When** the user activates the expand control, **Then** the sidebar returns to its full width showing all navigation entries.
3. **Given** the user has collapsed or expanded the sidebar, **When** they reload the page or navigate to another tool, **Then** the sidebar remembers their last chosen state.

---

### User Story 3 - Consistent navigation across all pages (Priority: P2)

A user expects the same sidebar, in the same state, behaving the same way, regardless of which of the site's pages they are currently on.

**Why this priority**: Without consistency, the user would need to relearn or re-toggle navigation on every page, undermining the purpose of a unified navigation element. This is slightly lower priority than the core open/navigate behavior because the site is still usable (just inconsistent) without it.

**Independent Test**: Collapse the sidebar on one page, navigate to a different tool page, and confirm the sidebar's collapsed/expanded state and list of links are consistent.

**Acceptance Scenarios**:

1. **Given** the sidebar is present on one tool page, **When** the user visits any other tool page, **Then** the same sidebar with the same set of links is present there too.
2. **Given** the old arrow-based navigation links existed in each page's header, **When** the sidebar is introduced, **Then** the arrow links are removed and no longer shown.

### Edge Cases

- What happens on narrow/small-screen (mobile) viewports where a fully expanded sidebar would cover most of the content? The sidebar MUST default to collapsed on narrow viewports and overlay (rather than push) content when expanded, so it never permanently blocks the page's primary content.
- What happens if a user has JavaScript disabled or scripts fail to load? The navigation links themselves MUST remain reachable (e.g., rendered in the markup) even if the expand/collapse toggle behavior is unavailable, so users are never fully blocked from navigating between tools.
- What happens if the user is in the middle of unsaved input (e.g., a search box) when they toggle the sidebar? Toggling or navigating via the sidebar MUST NOT clear or reset in-progress state on the current page beyond normal page navigation behavior.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a single sidebar navigation element present on every tool page (Proxy Sheet Builder, Draft Collection Manager, Progression Series Pack Puller) that lists links to all of the site's tool pages.
- **FR-002**: The sidebar MUST visually indicate which page is the currently active/open one.
- **FR-003**: The sidebar MUST support an expanded state, showing the full list of navigation entries with readable labels.
- **FR-004**: The sidebar MUST support a collapsed/hidden state that uses minimal screen space, triggered by an explicit, always-reachable toggle control.
- **FR-005**: The system MUST remember the user's last chosen sidebar state (expanded or collapsed) and restore it on subsequent page loads and navigations within the site.
- **FR-006**: The system MUST remove the existing previous/next arrow-link navigation currently present in each page's header, replacing it entirely with the sidebar.
- **FR-007**: The sidebar MUST remain usable (links reachable, toggle operable) across the range of viewport sizes the site already supports, including narrow/mobile widths, without permanently obscuring the page's primary content.
- **FR-008**: Clicking a sidebar link for the current page MUST NOT cause an unnecessary page reload or navigation loop (e.g., it may be visually disabled or simply a no-op).

### Key Entities

- **Navigation Entry**: Represents one tool/page the sidebar links to. Attributes: display label (e.g., "Draft Collection Manager"), destination page, active/inactive state.
- **Sidebar State**: Represents the user's current expand/collapse preference for the sidebar, persisted across page loads.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any tool page, a user can reach any other tool page in a single click via the sidebar.
- **SC-002**: Users can fully hide the sidebar and fully restore it in a single click each, with the resulting state visible immediately (no perceptible delay).
- **SC-003**: 100% of the site's tool pages expose the identical set of navigation entries through the sidebar.
- **SC-004**: A user's sidebar expand/collapse choice persists across at least a full navigation session (moving between all three tool pages) without needing to be re-set on each page.
- **SC-005**: No arrow-based ("&larr;"/"&rarr;") navigation links remain on any tool page after the change.

## Assumptions

- The site currently consists of exactly three tool pages — index.html (Proxy Sheet Builder), collection.html (Draft Collection Manager), and tracker.html (Progression Series Pack Puller) — and the sidebar's link list covers these three; adding a fourth page in the future would require adding it to the shared navigation list.
- "Hide" is interpreted as a fully collapsed/minimized state (e.g., a narrow icon strip or fully off-screen), not a separate "remove from DOM" requirement — the toggle control itself remains visible/reachable at all times so the sidebar can always be reopened.
- Sidebar state persistence is scoped to the user's browser (e.g., local storage) and does not require any server-side account or backend, consistent with this being a static, client-side tool.
- No authentication or per-user permissions are involved; all visitors see the same navigation entries.
- Visual styling of the sidebar should be consistent with the site's existing look and feel, but exact visual design is an implementation decision for the planning phase, not a specification requirement.
