# Research: Filter Counts & Synergy Tab

## 1. Where a card's effect text lives
- **Decision**: Read the existing fields in order: `effect`, `desc`, `pendDesc`, `monsterDesc` (the same set the Backlog search already uses) and join them.
- **Rationale**: Pendulum cards keep the Pendulum text and the monster text separately; the search already treats them as one text. Reusing that keeps behavior consistent.
- **Alternatives**: A new stored field (rejected: duplicates data and needs migration).

## 2. Extracting quoted names
- **Decision**: Match text between straight double quotes (`"..."`) or curly pairs (`“...”`), 1 to 80 characters, trimmed and with inner whitespace collapsed. Names are keyed by their lower-case form; the first-seen spelling is displayed.
- **Rationale**: Card texts quote names with straight quotes; some data uses curly ones. Case-insensitive keys merge "Blue-Eyes White Dragon" with a differently cased mention.
- **Alternatives**: Using a list of known archetypes (rejected: requires an external data source and the spec says none is consulted).

## 3. Ties between cards and names
- **Decision**: A card is tied to a name when its set of quoted names contains the key, or its own lower-case name contains the key as a substring. Each card counts once per name.
- **Rationale**: Matches clarified spec (quoted-only in effect text; own name anywhere).
- **Alternatives**: Whole-word matching of own names (rejected in clarification).

## 4. Computing the index efficiently
- **Decision**: One pass collects each card's quoted keys (Set) and builds the global key set; a second pass counts ties: for every card, add 1 for each of its own quoted keys and for each global key found inside its lower-case name. The index is built when the filter window opens and again after background completion, then reused by the tab, the counts and the search box.
- **Rationale**: About 2,000 cards by a few thousand names is a few million substring checks, well within the 1 s goal; nothing is recomputed on each keystroke of the tab's search box (that only filters the ready list).
- **Alternatives**: Persisting the index (rejected: stale data risk, no benefit at this size).

## 5. Where the synergy selection is stored and how it combines
- **Decision**: Add `synergy: [key]` to the existing `ygoBacklogFilter` record (keys, lower-case). `matchesFilter` = type rule AND (no synergy selected OR card tied to any selected key). The filter is active when any type is ticked or any synergy name is selected. The icon badge shows ticked types plus 1 when a synergy selection exists.
- **Rationale**: Same record means same per-profile restore, clear action and save-file mirroring with no new key; cross-type behavior falls out of applying the synergy rule independently of the type tabs.
- **Alternatives**: A separate key (rejected: two records to keep in sync and clear).

## 6. Counts
- **Decision**: A new pure function returns, for one tab, a map `valueGroup → value → number of distinct cards` plus counts for the Monster tab's normal/effect split. The window prints `value (n)` and puts the same text in the chip's accessible name. Counts are fixed (clarified): they do not depend on the draft.
- **Rationale**: Reuses the single pass structure of `availableValues`; no dependence on UI state.
- **Alternatives**: Live counts (rejected in clarification).

## 7. Completing missing effect text
- **Decision**: Extend the existing completion routine's "needs details" test to include cards without any effect text, keeping its batching (50 ids per request) and once-per-card marker.
- **Rationale**: Already follows the API-footprint principle; synergy names and counts refresh when it finishes.
- **Alternatives**: A dedicated routine (rejected: duplicate code).

## 8. Tab strip
- **Decision**: The Synergy tab is appended after the nine type tabs and shares the tab list's keyboard handling (arrows, Home/End); the nine-plus-one tabs must still fit one line, so tab padding is reduced slightly if needed.
- **Rationale**: Keeps the established tab interaction.
- **Alternatives**: A separate section above the tabs (rejected: not "its own tab").
