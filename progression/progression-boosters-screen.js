/*
 * Booster Pull screen: behaviour. Lists the loose boosters (bought or won) the user has, opens one at a time with
 * the same one-card-at-a-time pull as the stage box, and keeps the open pack's pulled list up to date. Drawing is in
 * views/booster-pull-view.js; the shared state is in progression-context.js.
 */
let extraReveal = null;
let extraAreaEl = null;
let extraActionEl = null;
let extraStripEl = null;
let extraListEl = null;
let pendingExtraFinish = null; // { run } when the backlog merge succeeded but the run could not be saved yet

/* The loose boosters with at least one pack, in release order. */
function looseBoosters(run) {
  const inventory = run.packInventory || {};
  return MAINLINE_BOOSTERS.filter((name) => inventory[name] > 0).map((name) => ({ name, amount: inventory[name] }));
}

/* Cards pulled so far from the open loose pack, rarest first (the list redraws after each reveal). */
function drawExtraPulledList() {
  const extra = getExtraPack(currentRun);
  const cards = extra ? extra.pack.cards.filter((_, i) => extra.pack.revealed[i]) : [];
  renderPulledList(extraListEl, cards, "Pulled from this pack");
}

function completeExtraPack() {
  const result = finishExtraPack(currentRun);
  if (!pendingExtraFinish) {
    if (!mergeCardsIntoBacklog(result.cards)) {
      setProgressionStatus(SAVE_PULLS_ERROR, true);
      return false;
    }
    pendingExtraFinish = { run: result.run };
  }
  if (!persistRun(pendingExtraFinish.run)) return false;
  pendingExtraFinish = null;
  setProgressionStatus("");
  return true;
}

function extraAction(saved) {
  if (!saved) {
    return {
      label: "Retry save",
      onClick: () => {
        if (completeExtraPack()) drawBoosterScreen();
      },
    };
  }
  return { label: "Done", onClick: drawBoosterScreen };
}

function setExtraAction(action) {
  extraActionEl.innerHTML = "";
  if (!action) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary pack-next-btn";
  btn.textContent = action.label;
  btn.addEventListener("click", action.onClick);
  extraActionEl.appendChild(btn);
}

function mountExtraPack() {
  const extra = getExtraPack(currentRun);
  // Cards already pulled from this pack (e.g. after leaving the page), newest first.
  extra.pack.cards
    .filter((_, i) => extra.pack.revealed[i])
    .reverse()
    .forEach((card) => extraStripEl.appendChild(buildRevealedCardElement(card)));
  drawExtraPulledList();
  let saved = false;
  extraReveal = createPackReveal(extraAreaEl, {
    pack: extra.pack,
    pulledStripEl: extraStripEl,
    actionSlotEl: extraActionEl,
    onReveal: (index) => {
      persistRun(revealInExtraPack(currentRun, index));
      drawExtraPulledList(); // real time
    },
    onPackComplete: () => {
      saved = completeExtraPack();
    },
    nextAction: () => extraAction(saved),
  });
}

/* Generate the pack FIRST; only if that works, take it out of the inventory and keep it as the open pack. */
function onOpenBought(setName) {
  if (busy || getExtraPack(currentRun)) return;
  busy = true;
  setProgressionStatus("Opening pack…");
  generatePack(setName)
    .then((cards) => {
      if (!persistRun(startExtraPack(currentRun, setName, cards))) return;
      setProgressionStatus("");
    })
    .catch((err) => {
      console.warn("Could not open bought pack:", err);
      setProgressionStatus(OPEN_PACK_ERROR, true);
    })
    .finally(() => {
      busy = false;
      drawBoosterScreen();
    });
}

function drawBoosterScreen() {
  if (extraReveal) {
    extraReveal.destroy();
    extraReveal = null;
  }
  currentRun = currentRun ? loadRun(activeProfile.id) || currentRun : currentRun; // amounts always as saved
  const open = currentRun ? getExtraPack(currentRun) : null;
  const refs = renderBoosterPull(
    progressionRootEl,
    { boosters: currentRun ? looseBoosters(currentRun) : [], openPack: open, busy },
    { onOpenOne: onOpenBought }
  );
  if (!refs) return;
  ({ packAreaEl: extraAreaEl, packActionEl: extraActionEl, pulledStripEl: extraStripEl, pulledListEl: extraListEl } = refs);
  mountExtraPack();
}

function initBoosterScreen() {
  if (!initRunContext()) return;
  currentRun = loadRun(activeProfile.id);
  drawBoosterScreen();
  loadSetDates().then(() => {
    // Only redraw the pictures; never interrupt a pack being revealed.
    if (!extraReveal || extraReveal.isComplete()) drawBoosterScreen();
  });
}

initBoosterScreen();
