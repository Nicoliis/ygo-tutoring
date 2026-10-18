# Contract: Completionist Binder

## Pure rules (`shared/set-slots.js`)

```text
buildSetSlots(apiCards, setName)        -> [slot]            // one per card and rarity in that set, ordered
ownedFor(slot, collectionCards)         -> integer >= 0
completion(slots, collectionCards)      -> { owned, total, percent, complete }
unmatchedCopies(collectionCards)        -> integer >= 0
```

Guarantees: pure and DOM-free; `buildSetSlots` makes exactly one slot per card and rarity in the set (regional set numbers merge); `ownedFor` counts only recorded printings of the same card, set and rarity; `completion.total` equals `slots.length`.

## Shared fetch (`shared/pack-pool.js`)

```text
fetchSetApiCards(setName) -> Promise<apiCard[]>   // raw cards, cached per set; a rejected request is not cached
fetchSetCardPool(setName) -> unchanged result, built from fetchSetApiCards
```

At most one request per set per session across both callers.

## Binder controller (`collection/binder-controller.js`)

```text
createBinder({ container, buildSlot }) -> { render(items, focus), reset() }
```

Owns the offset, the narrow-window query (`BINDER_NARROW_MAX_PX`) and the previous/next handlers; draws through `renderBinderView`. The Backlog and the completionist binder each create their own.

## Completionist views (`workshop/views/`)

- **completionist-view.js**: `renderCompletionistShell(model, handlers)` where model = `{ sets, chosenSet, status: "idle" | "loading" | "error" | "ready" | "no-sets", progress, unmatched }`, handlers = `{ onChooseSet(name), onRetry() }`. The set chooser is a labelled `<select>` (most recent first); the progress line is `aria-live="polite"`; the unmatched note shows only when `unmatched >= UNMATCHED_NOTE_MIN`; loading and error text with a Retry button; the no-sets message explains how sets become available.
- **completionist-slot-view.js**: `buildCompletionistSlot(slot, { owned, onOpen })`:
  - picture button, `aria-label` = "<name>, <rarity>, owned ×N" or "<name>, <rarity>, missing";
  - rarity tag via `buildRarityBadge(slot.rarity)` on every slot;
  - owned: full colour, glow via `applyRarityGlow`, `×N` text;
  - missing: greyed picture, no glow, the text "Missing";
  - no image: stand-in with the card name;
  - selecting opens the card details (`slot.card` for missing, the collection card for owned); read-only, no drag, no edit.

## Page (`workshop/completionist.html`)

Workshop page with the shared navigation; listed in `areas.js` under Workshop as "Completionist Binder". Reads the active profile, its saved run (Progression Run) and collection on show (`pageshow`) and after a set is chosen.
