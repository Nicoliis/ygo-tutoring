// Completionist Binder screen: choose a set, see every card of it as binder slots (owned in colour, missing grey).
// Read-only: nothing is saved from this page.
const completionistRoot = document.getElementById("workshopMain");
const completionistProfile = getActiveProfile();

let completionistOwned = [];

let completionistBinder = null; // made once the page shell (and its binder container) exists

function buildSlotOfSet(slot) {
  return buildCompletionistSlot(slot, {
    owned: ownedFor(slot, completionistOwned),
    onOpen: () => openSlotDetails(slot),
  });
}

/* Your own copy opens with its printings; whatever it lacks (picture, effect) comes from the card database data. */
function openSlotDetails(slot) {
  const mine = completionistOwned.find((card) => sameCard(slot, card));
  const printing = `<p class="completionist-printing"><strong>${escapeHtml(slot.setName)}</strong>${slot.setCode ? ` · ${escapeHtml(slot.setCode)}` : ""} · ${escapeHtml(rarityLabel(slot.rarity))}</p>`;
  if (!mine) {
    openCardDetailModal(slot.card, undefined, printing);
    return;
  }
  const merged = { ...slot.card, ...mine };
  Object.keys(slot.card).forEach((field) => {
    if (merged[field] === null || merged[field] === undefined) merged[field] = slot.card[field];
  });
  merged.desc = mine.desc || mine.effect || slot.card.desc;
  openCardDetailModal(merged, undefined, printing);
}

function drawCompletionist() {
  completionistOwned = readOwnedCards();
  const ready = completionist.status === "ready";
  const parts = renderCompletionistShell(
    completionistRoot,
    {
      sets: completionist.sets,
      chosenSet: completionist.chosenSet,
      status: completionist.status,
      progress: ready ? completion(completionist.slots, completionistOwned) : null,
      unmatched: unmatchedCopies(completionistOwned),
    },
    { onChooseSet: chooseCompletionistSet, onRetry: () => chooseCompletionistSet(completionist.chosenSet) }
  );
  if (!completionistBinder) completionistBinder = createBinder({ container: parts.binderEl, buildSlot: buildSlotOfSet });
  if (ready) completionistBinder.render(completionist.slots);
}

function chooseCompletionistSet(setName) {
  completionist.chosenSet = setName;
  completionist.status = "loading";
  completionist.slots = [];
  if (completionistBinder) completionistBinder.reset();
  drawCompletionist();
  loadSetSlots(setName)
    .then((slots) => {
      if (completionist.chosenSet !== setName) return; // another set was chosen meanwhile
      completionist.slots = slots;
      completionist.status = "ready";
      drawCompletionist();
    })
    .catch(() => {
      if (completionist.chosenSet !== setName) return;
      completionist.status = "error";
      drawCompletionist();
    });
}

completionist.sets = availableSets(completionistProfile);
if (completionist.sets.length === 0) {
  completionist.status = "no-sets";
  drawCompletionist();
} else {
  chooseCompletionistSet(completionist.sets[0]);
}

// Coming back to the page (including with the browser's back button): show what is owned now.
window.addEventListener("pageshow", (event) => {
  if (event.persisted && completionist.status === "ready") drawCompletionist();
});
