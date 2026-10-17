/* Shared by the Sell and Buy screens: the run, the collection, the balance header and status line. */
let storeProfile = null;
let storeRun = null;
let storeCollection = null;

const STORE_SAVE_ERROR = "Couldn't save — browser storage is unavailable or full. Nothing was changed.";

function setStoreStatus(message, isError) {
  const el = document.getElementById("storeStatus");
  el.textContent = message || "";
  el.classList.toggle("error", Boolean(isError));
}

function renderBalance() {
  document.getElementById("storeBalance").textContent = `Balance: ${formatMoney(getBalanceCents(storeRun))}`;
}

function renderNoBalance() {
  document.getElementById("storeContent").innerHTML =
    '<section class="panel"><h2>No balance in this profile</h2>' +
    "<p>The Store belongs to Progression Run profiles. This profile has no run rules, so there is no balance to spend.</p>" +
    '<p><a href="../workshop/backlog.html">Go to the Workshop</a> · <a href="../menu.html">Back to the menu</a></p></section>';
  document.getElementById("storeBalance").hidden = true;
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
