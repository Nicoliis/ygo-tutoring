# Contract: Booster Draft Page Integration

This is the internal "contract" between the new `draft.html`/`draft.css`/`draft.js` page and (a)
the shared sidebar from `007-sidebar-navigation`, and (b) the existing backlog storage owned by
`001-draft-collection-manager`. There is no external network API introduced by this feature beyond
the YGOPRODeck endpoints already used by `tracker.js`.

## 1. Sidebar integration (`nav.js`)

`draft.html` MUST include `nav.css` and `nav.js` identically to the other three pages (per
`specs/007-sidebar-navigation/contracts/nav-component.md`):

```html
<link rel="stylesheet" href="nav.css">
...
<script src="nav.js"></script>
<script src="draft.js"></script>
```

`nav.js`'s `NAV_ENTRIES` list gains exactly one new entry:

```js
{ label: "Booster Draft", href: "draft.html" }
```

No other change to `nav.js`'s structure, active-page detection, or persistence logic is required —
those already operate generically over whatever entries `NAV_ENTRIES` contains.

## 2. YGOPRODeck API usage contract

`draft.js` MUST call only the same two endpoints `tracker.js` already uses, with the same caching
discipline (research.md Decision 1):

- `GET https://db.ygoprodeck.com/api/v7/cardsets.php` — once per page session, cached in memory,
  powers the booster autocomplete field.
- `GET https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=<name>` — once per distinct set name
  per session, cached in memory, powers both the weighted draw and the per-card `sortValue`
  extraction (rarity weight or `tcgplayer_price`).

No other network endpoint may be called by this feature.

## 3. Backlog write contract

"Add to Backlog" (FR-014/FR-015) MUST:

1. Read the current backlog from `localStorage["ygoCollection"]` (parsing failures handled the same
   defensive way `collection.js` already does: treat an unreadable/missing value as an empty
   backlog rather than erroring).
2. For each Kept Card (data-model.md), find an existing backlog entry whose `name` matches
   case-insensitively; if found, increment its `quantityOwned` by 1 and additively fill any
   currently-missing fields from the Kept Card's data (never overwriting a field that already has a
   value) — mirroring `addOrIncrementCardFromSearchResult`'s exact rule; if not found, append a new
   backlog entry with `quantityOwned: 1` and the Kept Card's available fields.
3. Write the updated backlog back to `localStorage["ygoCollection"]` once, after all Kept Cards
   have been merged (not once per card), so a failure partway through never leaves the backlog
   half-updated.

`draft.js` MUST NOT write to any other `localStorage` key, and MUST NOT read/write
`ygoCollection` at any other point in the draft flow (only on explicit "Add to Backlog").

## 4. What `draft.js` does NOT depend on

`draft.js` has no dependency on `app.js`, `collection.js`, or `tracker.js` being loaded or present
in the same page — it is a fully independent page module, consistent with every other tool page in
this app. It reads the shared `ygoCollection` storage format by convention (documented above), not
by any runtime coupling to `collection.js`'s code.
