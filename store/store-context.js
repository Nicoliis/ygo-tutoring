/* Shared by the Sell and Buy screens: the run and the collection of the active profile. Drawing lives in views/. */
let storeProfile = null;
let storeRun = null;
let storeCollection = null;

const STORE_SAVE_ERROR = "Couldn't save — browser storage is unavailable or full. Nothing was changed.";

function renderBalance() {
  renderBalanceText(`Balance: ${formatMoney(getBalanceCents(storeRun))}`);
}

/* Loads the run and the collection of the active profile; false (after drawing a message) when it has no Store. */
function initStoreContext() {
  storeProfile = getActiveProfile();
  if (storeProfile.mode !== "progression") {
    renderNoBalance();
    return false;
  }
  storeRun = loadRun(storeProfile.id) || newRun(MAINLINE_BOOSTERS);
  reloadStoreCollection();
  renderBalance();
  return true;
}

function reloadStoreCollection() {
  const stored = loadData(profileKey("ygoCollection")) || {};
  storeCollection = {
    ...stored,
    cards: Array.isArray(stored.cards) ? stored.cards : [],
    engines: Array.isArray(stored.engines) ? stored.engines : [],
    decks: Array.isArray(stored.decks) ? stored.decks : [],
  };
}

function saveStoreRun(run) {
  if (!saveRun(storeProfile.id, run)) return false;
  storeRun = run;
  renderBalance();
  return true;
}

function saveStoreCollection() {
  return saveData(storeCollection, profileKey("ygoCollection"));
}
