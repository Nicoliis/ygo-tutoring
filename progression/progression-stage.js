/*
 * Current Stage Pull screen: behaviour. Opens the stage's box pack by pack and keeps the "Pulled this box" list up to
 * date after every reveal. Drawing is in views/stage-view.js; the shared state is in progression-context.js.
 */
let packReveal = null;
let packAreaEl = null;
let packActionEl = null;
let pulledStripEl = null;
let pulledListEl = null;
let pendingFinish = null; // { run } when the backlog merge succeeded but the run could not be saved yet

/* "Pack x/24 · y/z cards" for the whole box, plus a thin progress bar. Safe to call at any time. */
function updateBoxProgress() {
  const el = document.getElementById("boxProgress");
  if (!el || !currentRun) return;
  const box = getBox(currentRun);
  const packNumber = Math.min(BOX_PACKS, box.packsOpened + (box.pack ? 1 : 0));
  const totalCards = BOX_PACKS * getBoosterSize(currentRun.current);
  el.querySelector(".box-progress-text").textContent =
    `Pack ${packNumber}/${BOX_PACKS} · ${box.pulled.length}/${totalCards} cards pulled`;
  const bar = el.querySelector(".box-progress-bar");
  bar.max = totalCards;
  bar.value = box.pulled.length;
}

/* Every card pulled in this stage's box so far, rarest first. */
function drawPulledList() {
  renderPulledList(pulledListEl, getBox(currentRun).pulled);
}

function setPackAction(action) {
  packActionEl.innerHTML = "";
  if (!action) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-primary pack-next-btn";
  btn.textContent = action.label;
  btn.addEventListener("click", action.onClick);
  packActionEl.appendChild(btn);
}

/* Merge the finished pack into the backlog, then advance the run. Returns true when fully saved. */
function completePack() {
  const result = finishPack(currentRun);
  if (!pendingFinish) {
    if (!mergeCardsIntoBacklog(result.cards)) {
      setProgressionStatus(SAVE_PULLS_ERROR, true);
      return false;
    }
    pendingFinish = { run: result.run };
  }
  if (!persistRun(pendingFinish.run)) return false;
  pendingFinish = null;
  setProgressionStatus("");
  return true;
}

function actionAfterPack(saved) {
  if (!saved) {
    return {
      label: "Retry save",
      onClick: () => {
        const ok = completePack();
        setPackAction(actionAfterPack(ok));
        if (ok && getBox(currentRun).packsOpened >= BOX_PACKS) drawStageScreen();
      },
    };
  }
  return getBox(currentRun).packsOpened >= BOX_PACKS
    ? { label: "Box finished", onClick: drawStageScreen }
    : { label: "Next pack", onClick: onNextPack };
}

function mountPack() {
  const pack = getBox(currentRun).pack;
  let saved = false;
  packReveal = createPackReveal(packAreaEl, {
    pack,
    pulledStripEl,
    actionSlotEl: packActionEl,
    onReveal: (index) => {
      persistRun(revealInPack(currentRun, index));
      drawPulledList(); // real time: the new card is in the list at once
    },
    onPackComplete: () => {
      saved = completePack();
    },
    nextAction: () => {
      const action = actionAfterPack(saved);
      if (saved && getBox(currentRun).packsOpened >= BOX_PACKS) setTimeout(drawStageScreen, 0); // show the finished state
      return action;
    },
  });
}

/* Cards of the pack in progress (pull order), or of the last finished pack when none is open. */
function currentPackCards(run) {
  const box = getBox(run);
  if (box.pack) return box.pack.cards.filter((_, i) => box.pack.revealed[i]);
  if (box.packsOpened === 0) return [];
  return box.pulled.slice(-getBoosterSize(run.current));
}

function mountOpener() {
  const box = getBox(currentRun);
  updateBoxProgress();
  drawPulledList();
  // The strip shows the current (or last) pack, newest pull first; the whole box is in the list below.
  currentPackCards(currentRun).reverse().forEach((card) => pulledStripEl.appendChild(buildRevealedCardElement(card)));
  if (boxPhase(currentRun) === "finished") return;
  if (box.pack) mountPack();
  else setPackAction({ label: "Next pack", onClick: onNextPack });
}

function startNewPack() {
  busy = true;
  setProgressionStatus("Opening pack…");
  return generatePack(currentRun.current)
    .then((cards) => {
      if (!persistRun(startPack(currentRun, { cards }))) return;
      setProgressionStatus("");
    })
    .catch((err) => {
      console.warn("Could not open pack:", err);
      setProgressionStatus(OPEN_PACK_ERROR, true);
    })
    .finally(() => {
      busy = false;
    });
}

function onNextPack() {
  if (busy || getBox(currentRun).pack) return;
  setPackAction(null);
  startNewPack().then(() => {
    if (getBox(currentRun).pack) {
      packAreaEl.innerHTML = "";
      pulledStripEl.innerHTML = ""; // each new pack starts an empty pulled strip (cards stay stored and listed below)
      mountPack();
    } else {
      setPackAction({ label: "Next pack", onClick: onNextPack });
    }
  });
}

/* What the screen shows for the saved run. */
function stageScreenState(run) {
  if (!run) return "no-run";
  if (run.current === null) return "run-finished";
  const phase = boxPhase(run);
  return phase === "not-started" ? "not-started" : phase === "finished" ? "finished" : "in-progress";
}

function drawStageScreen() {
  if (packReveal) {
    packReveal.destroy();
    packReveal = null;
  }
  const refs = renderStage(progressionRootEl, {
    stageName: currentRun ? currentRun.current : "",
    state: stageScreenState(currentRun),
  });
  if (!refs) return;
  ({ packAreaEl, packActionEl, pulledStripEl, pulledListEl } = refs);
  mountOpener();
}

function initStageScreen() {
  if (!initRunContext()) return;
  currentRun = loadRun(activeProfile.id);
  drawStageScreen();
}

initStageScreen();
