/*
 * Completionist binder behaviour: which sets are offered, loading a set's slots, and reading what the user owns.
 * Nothing here writes saved data. Drawing is in views/; paging is in ../collection/binder-controller.js.
 *
 * Needs set-slots.js, pack-pool.js (fetchSetApiCards), mainline-boosters.js and progression-state.js.
 */
const COLLECTION_KEY_NAME = "ygoCollection"; // per-profile saved collection (see profileKey)

const completionist = {
  sets: [], // set names, most recent first
  chosenSet: null,
  status: "idle", // "idle" | "loading" | "error" | "ready" | "no-sets"
  slots: [],
};
const setSlotsCache = new Map(); // setName -> slots, for this visit (failures are never stored)

/* Progression Run: the boosters reached so far. Sandbox: every mainline booster. Most recent first. */
function availableSets(profile) {
  const list =
    profile.mode === "progression"
      ? reachedBoosters(loadRun(profile.id) || newRun(MAINLINE_BOOSTERS), MAINLINE_BOOSTERS)
      : MAINLINE_BOOSTERS.slice();
  return list.reverse();
}

/* The slots of one set. A set is requested once (shared with the pack pool); a failed request can be retried. */
function loadSetSlots(setName) {
  if (setSlotsCache.has(setName)) return Promise.resolve(setSlotsCache.get(setName));
  return fetchSetApiCards(setName).then((apiCards) => {
    const slots = buildSetSlots(apiCards, setName);
    setSlotsCache.set(setName, slots);
    return slots;
  });
}

/* The cards the active profile owns, read fresh from storage each time. */
function readOwnedCards() {
  const stored = loadData(profileKey(COLLECTION_KEY_NAME)) || {};
  return Array.isArray(stored.cards) ? stored.cards : [];
}
