# Contract: Engines Panel

## Window helper (`shared/card-detail-window.js`)

```text
showCardDetailWindow({ card, title, detailHtml, buttons, pull }) -> void
```

- Builds the two-column body (`.card-detail-layout`: `.card-detail-main` with `detailHtml`, `aside.card-detail-engines`) and opens it with `showModal`; `buttons` are the window's own buttons, unchanged.
- Mounts the engines panel into the aside for `card`; `pull` is `null` or `{ canSave, availableCopies(), saveEarly() }` supplied by the page that owns the pull.
- Both `openCardDetailModal` versions call it; their public signature keeps `(card, buttons, extraHtml)` and gains a fourth optional `pull`.

## Pull context (supplied by Progression and Draft pages, via `pack-reveal.js` / pick buttons)

```text
pullContextFor(card) -> null | {
  canSave: boolean,            // false for an unpicked draft card (panel read-only with a note)
  availableCopies(): integer,  // unmarked identical copies still to be saved
  saveEarly(): boolean         // merges ONE copy into the Backlog and flags it savedEarly; false (and nothing changed) on failure
}
```

`pack-reveal.js` calls `pullContextFor` if the page defines it and passes the result to `openCardDetailModal`.

## Panel behaviour (`shared/card-engines.js`)

```text
mountEnginesPanel(containerEl, card, pull)
```

- Reads the saved collection when mounted and after every change; resolves the owned card with `resolveOwnedCard`.
- Add: if the engine count would exceed the owned copies and `pull` has `availableCopies() > 0`, run `pull.saveEarly()` first; on any failure show the message and change nothing.
- Remove: lowers the count; never changes owned quantities.
- Create: trimmed non-empty name → engine with one copy of the card (after an early save if needed) at the top of the list.
- After each successful change call `onCardEnginesChanged()` if the page defines it, and announce the result in the panel's live region ("Added to <engine>", "Removed from <engine>", "Created <engine>").

## Panel view (`shared/views/card-engines-view.js`)

`renderEnginesPanel(containerEl, model, handlers)`

- model = `{ cardName, engines: [{ id, name, count, canAdd, addReason }], readOnlyReason, search, announcement }`; handlers = `{ onAdd(id), onRemove(id), onCreate(name), onSearch(text) }`.
- Rows: name, `×count`, a remove button (disabled at 0) and an add button (disabled with its reason as `title`/`aria-describedby` when `canAdd` is false); each button has an accessible name ("Add <card> to <engine>").
- A search field above the list when there are more than `ENGINE_SEARCH_MIN_COUNT` engines; a "new engine" field with a button; the live region for announcements; the empty-state text when there are no engines; the read-only note when `readOnlyReason` is set.
- DOM only: no storage, no rules.

## Page hook

`onCardEnginesChanged()` (optional global): the Workshop pages reload the in-memory collection and redraw; Store sell reloads its collection and redraws; the Tracker reloads its collection. Pages that read storage per operation (Progression, Draft, completionist) define nothing.

## Pure rules (`shared/engine-rules.js`)

See `data-model.md`. Guarantees: the engine count never exceeds `min(owned, 3)`; entries are merged by `cardId`; an empty name creates nothing.
