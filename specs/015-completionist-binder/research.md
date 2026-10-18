# Research: Completionist Binder

## 1. Where the set's cards come from
- **Decision**: Reuse the request the pack generator already makes (`cardinfo.php?cardset=<set>`). Split `fetchSetCardPool` so its fetch becomes `fetchSetApiCards(setName)` returning the raw card list and caching it per set; `fetchSetCardPool` and the new `loadSetSlots` both call it.
- **Rationale**: The answer already holds every card with all its `card_sets` entries (one per set number and rarity) and its pictures. Sharing the cache means choosing a set in the binder that was just used for packs costs no request (Constitution II).
- **Alternatives**: A second endpoint call for sets (extra request, no extra data); storing the list in `localStorage` (not asked for; sets can be large; adds stale-data handling).

## 2. What a slot is
- **Decision**: One slot per card and rarity among the `card_sets` entries whose `set_name` equals the chosen set. The API lists a printing once per regional set number (LOB-001, LOB-E001, LOB-EN001), so those are merged into one slot and the English number is shown. Sorted by the numeric end of the set number, then rarity rank (common first, using the existing `rarityRank`), then name.
- **Rationale**: The existing pool kept only the first entry per card; the binder needs one per rarity (User Story 2). Real data showed Legend of Blue Eyes listing 358 entries for 129 distinct card/rarity printings, so unmerged slots would triple-count and colour three slots per owned card.
- **Alternatives**: One slot per card with rarity chips (hides which printings are missing); grouping rarities under a card (breaks the binder grid).

## 3. Matching what the user owns
- **Decision**: A recorded printing matches a slot when it is the same card (by `apiId` when both have it, else lower-cased name), the same set name and the same rarity (case-insensitive). The recorded set number is not compared. Owned copies of a slot = sum of matching printings' quantities.
- **Rationale**: Printings are recorded at pull time as (set, rarity[, setCode]) (feature 011); the card database gives the same strings, so exact matching is reliable; the recorded number may be any regional number of the same printing, so it must not decide the match.
- **Alternatives**: Match by name and set only (colours every rarity, violates FR-004/SC-003); fuzzy matching on rarity text (hides real mismatches).

## 4. Copies that cannot be matched
- **Decision**: Per spec clarification, copies without a recorded set or rarity colour nothing. The note counts them: `quantityOwned − sum(printings quantities)` for each card, plus printings missing a rarity or a set.
- **Rationale**: Honest per-set ownership; the note tells the user why a card they own may look missing.
- **Alternatives**: Colour the slot when the card has a single entry in the set (rejected in clarification).

## 5. Sharing the binder behaviour with the Backlog
- **Decision**: Extract `createBinder({ container, buildSlot })` into `collection/binder-controller.js`. It owns the offset, the narrow-window media query, the previous/next handlers and redraws through the existing `renderBinderView`; it returns `render(items, focus)` and `reset()`. The Backlog's `collection-binder-state.js` becomes a thin user of it.
- **Rationale**: The completionist binder needs exactly the same state machine; copying it would duplicate ~40 lines (Constitution III). `renderBinderView` already takes arbitrary items and a `buildSlot` callback.
- **Alternatives**: Duplicate the state file (drift risk); make the Backlog state generic in place (global singletons conflict between two binders).

## 6. Which sets are offered
- **Decision**: Progression Run profile: `reachedBoosters(run, MAINLINE_BOOSTERS)`, reversed (most recent first), same as the Buy screen. Sandbox profile: all of `MAINLINE_BOOSTERS`, reversed. `reachedBoosters` moves from `store/store-state.js` to `progression/progression-state.js` (which already owns the run) so the Workshop page does not load Store code.
- **Rationale**: Matches the clarified rule with one shared function; the Store keeps working because it already loads `progression-state.js`.
- **Alternatives**: Load `store-state.js` on the Workshop page (pulls money, printings and sale rules for one helper).

## 7. Look of owned vs missing slots
- **Decision**: Owned: normal picture, the rarity glow on the slot's card frame (`applyRarityGlow`), rarity tag (`buildRarityBadge`) and `×N`. Missing: picture with `filter: grayscale(1)` and reduced opacity, no glow, rarity tag kept, the text "Missing" where `×N` would be. The accessible name states card, rarity and "owned ×N" or "missing".
- **Rationale**: Meets FR-004/005/017 (never colour alone), reuses the app's rarity helpers so rarities look the same everywhere.
- **Alternatives**: Hiding the tag on missing slots (rejected: the user must see which printing is missing).

## 8. Loading, errors and freshness
- **Decision**: Show "Loading <set>…" (`aria-live`) while the request runs; on failure show the message with a Retry button and no binder; the failed promise is not cached. The page reads the saved collection when it is shown (`pageshow`, including back/forward cache) and after choosing a set.
- **Rationale**: Meets FR-011, FR-014 and SC-006 without polling.
- **Alternatives**: Auto-retry (more requests); cache failures (stuck until reload).

## 9. Testing
- **Decision**: Slot building, order, multi-rarity, ownership matching, completion and unmatched count go through `shared/contract-tests.js`; `set-slots.js` joins the Node harness list and `shared/tests.html`.
- **Rationale**: Same pattern as the filter, store and paging rules; UI is verified by `quickstart.md`.
