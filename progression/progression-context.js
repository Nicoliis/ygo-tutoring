/*
 * Shared state of every Progression screen: the active profile, the saved run, the status line and the pull
 * context for the card details window. Each screen has its own behaviour file on top of this one.
 */
const SAVE_PULLS_ERROR = "Couldn't save your pulls — browser storage is unavailable or full.";
const OPEN_PACK_ERROR = "Couldn't open the pack — check your connection and try again.";

let activeProfile = null;
let currentRun = null;
let busy = false;

function setProgressionStatus(message, isError) {
  progressionStatusEl.textContent = message || "";
  progressionStatusEl.classList.toggle("error", Boolean(isError));
}

function countOwnedCards() {
  const blob = loadData(STORAGE_KEY);
  const cards = blob && Array.isArray(blob.cards) ? blob.cards : [];
  return cards.reduce((sum, c) => sum + (Number(c.quantityOwned) || 0), 0);
}

function stageLabel(name) {
  const date = getReleaseDate(name);
  return date ? `${name} (${date})` : name;
}


function persistRun(run) {
  if (!saveRun(activeProfile.id, run)) {
    setProgressionStatus("Couldn't save your progress — browser storage is unavailable or full.", true);
    return false;
  }
  currentRun = run;
  if (typeof updateBoxProgress === "function") updateBoxProgress(); // only the stage screen has a box progress line
  return true;
}

/*
 * What the card details window may do with a card just pulled (see shared/card-engines.js): when the card still has an
 * unsaved revealed copy in an open pack, putting it in an engine saves that copy to the backlog now and flags it so
 * finishing the pack skips it. Cards of finished packs are already in the backlog: no pull context.
 */
function pullContextFor(card) {
  const source = [PACK_SOURCE_BOX, PACK_SOURCE_EXTRA].find((src) => unsavedCopiesOf(currentRun, src, card) > 0);
  if (!source) return null;
  return {
    canSave: true,
    availableCopies: () => unsavedCopiesOf(currentRun, source, card),
    saveEarly() {
      if (!mergeCardsIntoBacklog([card])) {
        setProgressionStatus(SAVE_PULLS_ERROR, true);
        return false;
      }
      if (!persistRun(markCardSavedEarly(currentRun, source, card))) {
        unmergeCardFromBacklog(card); // the flag could not be saved: take the copy back so it is not counted twice
        return false;
      }
      return true;
    },
  };
}


function renderNoRules() {
  progressionRootEl.innerHTML = "";
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.innerHTML = `<h2>No run rules</h2>
    <p>This profile has no run rules. Use the other tools freely:</p>
    <p><a href="../workshop/backlog.html">Workshop</a> · <a href="../draft/index.html">Booster Draft</a> · <a href="../tracker/index.html">Pack Puller</a></p>`;
  progressionRootEl.appendChild(panel);
}


/* Reads the profile; false (after drawing the "no run rules" panel) when it has no Progression Run. */
function initRunContext() {
  activeProfile = getActiveProfile();
  if (activeProfile.mode !== "progression") {
    renderNoRules();
    return false;
  }
  return true;
}
