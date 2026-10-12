# Phase 1 Data Model: Collapsible Sidebar Navigation

This feature has no server-side data and no new YGOPRODeck API usage. The only "data" is a small,
static, in-memory navigation list and one persisted UI preference.

## Navigation Entry

Represents one tool/page the sidebar links to. Defined once, statically, inside `nav.js` (not
user-editable data).

| Field       | Type    | Description                                                        |
|-------------|---------|----------------------------------------------------------------------|
| `label`     | string  | Display text shown in the sidebar (e.g., "Draft Collection Manager") |
| `href`      | string  | Destination page filename (e.g., `collection.html`)                  |
| `isActive`  | boolean | Derived at render time — true when `href` matches the current page   |

**Validation rules**: `label` and `href` are non-empty, fixed at code-authoring time; there is no
runtime validation since the list is not user-editable. Exactly one entry's `isActive` must be
`true` per page (the page the user is currently viewing), per FR-002.

**Fixed instance data** (per Assumption in spec.md — three known pages):

| label                               | href              |
|--------------------------------------|-------------------|
| Proxy Sheet Builder                   | `index.html`      |
| Draft Collection Manager              | `collection.html` |
| Progression Series Pack Puller        | `tracker.html`    |

## Sidebar State

Represents the user's persisted expand/collapse preference.

| Field       | Type                        | Description                                                  |
|-------------|-----------------------------|----------------------------------------------------------------|
| `collapsed` | boolean                     | `true` = sidebar is in its collapsed/icon-rail (or hidden, on narrow viewports) state |

**Storage**: a single `localStorage` key, `ygoSidebarCollapsed`, holding the string `"true"` or
`"false"`. Absent key = no stored preference yet; the initial state is then derived from the
current viewport width (collapsed if narrower than `640px`, expanded otherwise — see
[research.md](./research.md) Decision 3).

**State transitions**:

```
(no stored value) --[viewport < 640px]--> collapsed (not yet persisted)
(no stored value) --[viewport >= 640px]--> expanded (not yet persisted)
collapsed --[user activates expand control]--> expanded (persisted)
expanded  --[user activates collapse control]--> collapsed (persisted)
```

There is no server round-trip and no multi-user concern — state is local to one browser, matching
the existing `ygoDeck` persistence pattern.
