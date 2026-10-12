# Contract: Shared Sidebar Component (`nav.js` / `nav.css`)

This is the internal "contract" between the shared sidebar component and each of the three host
HTML pages that include it. There is no network API in this feature; this document instead fixes
the integration points so each page can rely on identical behavior.

## What each host page must provide

Each of `index.html`, `collection.html`, `tracker.html` MUST include, inside `<head>`:

```html
<link rel="stylesheet" href="nav.css">
```

and, before its own page-specific `<script src="...">` tag (order does not functionally matter,
since `nav.js` is self-contained, but keeping it first keeps the three pages visually consistent):

```html
<script src="nav.js"></script>
```

No other per-page markup, IDs, or data attributes are required. `nav.js` is fully self-contained:
it builds its own DOM, determines the active page, and manages its own state.

## What `nav.js` guarantees

1. **Injection point**: On `DOMContentLoaded`, `nav.js` inserts a `<aside id="appSidebar">`
   element as the first child of `<body>`, before the page's existing root container
   (`#appRoot` / `#collectionRoot` / `#trackerRoot`). It also adds a class to `<body>`
   (`has-app-sidebar`) so `nav.css` can lay out the sidebar and page content side by side without
   any host page needing its own layout changes.
2. **Structure**: The injected sidebar contains:
   - A toggle `<button>` with `aria-expanded` reflecting current state and an accessible name
     (e.g., `aria-label="Toggle navigation sidebar"`).
   - A `<nav aria-label="Tool navigation">` containing one link per Navigation Entry
     (see [data-model.md](./../data-model.md)), each as an `<a href="...">`.
   - The entry matching the current page gets `aria-current="page"` and is rendered as the
     visually "active" entry; it MUST NOT navigate on click (FR-008).
3. **State persistence**: `nav.js` owns the `ygoSidebarCollapsed` `localStorage` key entirely;
   no host page reads or writes it directly.
4. **No collisions**: `nav.js` does not use, query, or register listeners on any existing
   page-specific IDs (`#appRoot`, `#collectionRoot`, `#trackerRoot`, or any IDs owned by
   `app.js`/`collection.js`/`tracker.js`), so it can be safely included on any page without
   coordination with that page's own script.
5. **No new network calls**: `nav.js` never calls the YGOPRODeck API or any other network
   endpoint (Constitution Principle II).

## Backward compatibility

Each host page's `<header class="app-header">` loses its `<nav class="app-nav">` arrow-link
block (removed per FR-006); no other existing markup, IDs, or script hooks on any page are
changed by this feature.
