# Research: Engines Panel in the Card Details Window

## 1. Where the panel is mounted
- **Decision**: A new helper `showCardDetailWindow({ card, title, detailHtml, buttons, pull })` in `shared/card-detail-window.js` builds `<div class="card-detail-layout"><div class="card-detail-main">…</div><aside class="card-detail-engines"></aside></div>`, calls `showModal`, then mounts the engines panel into the aside. Both `openCardDetailModal` implementations (`shared/card-detail-modal.js` and `collection/collection-card-detail-modal.js`) call it instead of `showModal`.
- **Rationale**: Nine screens open details through those two functions; mounting in one place guarantees "every modal" (spec FR-008) and keeps extra buttons and `extraHtml` intact.
- **Alternatives**: Add the panel to each screen's call (nine places, easy to miss one); wrap `showModal` itself (would add the panel to non-card dialogs).

## 2. Working without the Workshop's in-memory collection
- **Decision**: The panel reads the profile's saved collection with `loadData(profileKey("ygoCollection"))`, applies a pure change, writes it back with `saveData`, and then calls `onCardEnginesChanged()` if the page defines it. Pages that keep the collection in memory define the hook: Workshop pages (`collection = loadCollection(); renderAll()`), Store sell (`reloadStoreCollection()` then redraw) and Tracker (reload its collection).
- **Rationale**: Only the Workshop loads the collection modules; the rest read storage per operation (`mergeCardsIntoBacklog` already does). Without the hook, a stale in-memory copy would overwrite the engine change on the page's next save.
- **Alternatives**: Require every page to load the Workshop modules (heavy, couples unrelated screens); keep a second in-memory copy in the panel (same stale-overwrite risk).

## 3. Which card the panel works on
- **Decision**: `resolveOwnedCard(collection, card)` finds the owned card by `id`, else by `apiId`, else by lower-cased name (the same identity `mergeCardsIntoBacklog` uses). No match → the panel is read-only with an explanatory note.
- **Rationale**: Engines are lists of owned cards (they hold `cardId`s). The window can be opened with a backlog card, a database card (completionist, tracker) or a pulled card; name/`apiId` matching covers all, and a card owned in another rarity still works.
- **Alternatives**: Id only (fails for database and pulled cards).

## 4. The rule for adding
- **Decision**: Reuse the Workshop's rule exactly: an engine may hold at most `maxAllowedInGroup(card)` = `min(quantityOwned, 3)` copies of a card; engines are independent. The spec text was corrected where it assumed a cross-engine total or unique engine names, because the Workshop (`addCardToEngine`, `createEngine`) applies neither.
- **Rationale**: One rule everywhere; a card changed in the window behaves identically to a card changed in the Workshop.
- **Alternatives**: A stricter cross-engine allocation (would contradict the Workshop's existing data).

## 5. Early save of pulled and picked copies
- **Decision**: Adding a pulled copy to an engine when the user owns too few copies runs: (1) `mergeCardsIntoBacklog([copy])` (one copy, with its printing), (2) mark that copy `savedEarly` inside the pack (`markCardSavedEarly(run, source, card)`, matching the first identical unmarked copy by name, set, rarity and set number) and persist the run, (3) add to the engine. If step 2 cannot be saved, undo step 1 and show the error. `finishPack`, `finishExtraPack` and the draft's final merge skip `savedEarly` copies.
- **Rationale**: Satisfies "save now, never twice, never lose a copy" (FR-010/011). The flag lives on the pack's card inside the saved run, so closing the page keeps it; identical copies are interchangeable, so matching the first unmarked one is exact.
- **Alternatives**: Hold additions until the pack ends (rejected in clarification); flag by index (the strip rebuilds from saved data without indexes).

## 6. Several identical pulled copies
- **Decision**: When an add needs more owned copies than exist and the pack still holds an unmarked identical copy, save that copy early too (one per add). Effective owned = owned + unmarked identical pulled copies; the add control reflects it.
- **Rationale**: Satisfies "two pulled copies added to engines → the Backlog gets exactly two" (User Story 4, scenario 4), without ever saving a copy the user did not use.

## 7. Draft picks
- **Decision**: The draft provides a pull context only for cards in `session.keptCards`; the early save marks that kept card `savedEarly` and merges it, and the final merge skips flagged picks. Cards of an unpicked group and the draft reveal strip get a read-only panel with a note ("Keep this card first").
- **Rationale**: Clarified: only picked cards can be added. The draft session is in memory only, so the flag needs no persistence.
- **Alternatives**: Auto-pick when added (surprising).

## 8. Layout
- **Decision**: The dialog widens for the two-column layout (`.modal-dialog:has(.card-detail-layout)` max-width about 880px); a CSS grid with the details on the left and the panel on the right; under the narrow-window limit (700px, the Backlog binder's `BINDER_NARROW_MAX_PX`) the panel stacks below. The engine list scrolls inside the panel; a name search shows when there are more than `ENGINE_SEARCH_MIN_COUNT` engines.
- **Rationale**: Meets FR-001, FR-016 and SC-007 with CSS only.

## 9. Testing
- **Decision**: Pure functions in `shared/engine-rules.js` and the early-save marking/skip rules in `progression-state.js` and `backlog-merge.js` are covered in `shared/contract-tests.js`; `engine-rules.js` joins the Node harness and `shared/tests.html`.
- **Rationale**: Same pattern as the earlier features; the window itself is verified with `quickstart.md`.
