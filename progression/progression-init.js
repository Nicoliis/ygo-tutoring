const SAVE_PULLS_ERROR = "Couldn't save your pulls — browser storage is unavailable or full.";
const OPEN_PACK_ERROR = "Couldn't open the pack — check your connection and try again.";

let pendingFinish = null; // { run } when the backlog merge succeeded but the run could not be saved yet

function persistRun(run) {
  if (!saveRun(activeProfile.id, run)) {
    setProgressionStatus("Couldn't save your progress — browser storage is unavailable or full.", true);
    return false;
  }
  currentRun = run;
  updateBoxProgress();
  return true;
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
        if (ok) updateRunHeader();
      },
    };
  }
  return getBox(currentRun).packsOpened >= BOX_PACKS
    ? { label: "See pulled", onClick: toggleSeePulled }
    : { label: "Next pack", onClick: onNextPack };
}

/* Refreshes the parts of the page that depend on box progress without destroying the opener. */
function updateRunHeader() {
  const summary = progressionRootEl.querySelector(".run-summary");
  if (summary) {
    summary.textContent = `${activeProfile.name} — ${runSummary(currentRun, MAINLINE_BOOSTERS)} · ${countOwnedCards()} cards owned`;
  }
  if (currentRun.boxOpened) renderRun();
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
    },
    onPackComplete: () => {
      saved = completePack();
    },
    nextAction: () => {
      const action = actionAfterPack(saved);
      // After the 24th pack the stage can be completed, so the page is redrawn.
      if (saved) setTimeout(updateRunHeader, 0);
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
  // The strip only shows the current (or last) pack, newest pull first; the whole box is in "See pulled".
  currentPackCards(currentRun).reverse().forEach((card) => pulledStripEl.appendChild(buildRevealedCardElement(card)));
  const phase = boxPhase(currentRun);
  if (phase === "finished") {
    setPackAction({ label: "See pulled", onClick: toggleSeePulled });
  } else if (box.pack) {
    mountPack();
  } else {
    setPackAction({ label: "Next pack", onClick: onNextPack });
  }
}

function toggleSeePulled() {
  const existing = document.getElementById("seePulled");
  if (existing) {
    existing.remove();
    return;
  }
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "seePulled";
  const heading = document.createElement("h2");
  const cards = getBox(currentRun).pulled;
  heading.textContent = `Pulled this box (${cards.length})`;
  panel.appendChild(heading);
  panel.appendChild(buildPulledList(cards));
  const opener = pulledStripEl.closest(".panel");
  opener.insertAdjacentElement("afterend", panel);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
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

async function onStartBox() {
  const check = canOpenBox(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  const ok = await confirmDialog(`Start the box for "${currentRun.current}"? This can't be undone.`, { title: "Start box", confirmLabel: "Start" });
  if (!ok) return;
  startNewPack().then(renderRun);
}

function onNextPack() {
  if (busy || getBox(currentRun).pack) return;
  setPackAction(null);
  startNewPack().then(() => {
    if (getBox(currentRun).pack) {
      packAreaEl.innerHTML = "";
      pulledStripEl.innerHTML = ""; // each new pack starts an empty pulled strip (cards stay stored)
      mountPack();
    } else {
      setPackAction({ label: "Next pack", onClick: onNextPack });
    }
  });
}

async function onCompleteStage() {
  const check = canCompleteStage(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  const ok = await confirmDialog(`Complete "${currentRun.current}" and move to the next booster? This can't be undone.`, { title: "Complete stage", confirmLabel: "Complete" });
  if (!ok) return;
  if (persistRun(completeStage(currentRun, MAINLINE_BOOSTERS))) setProgressionStatus("");
  renderRun();
}

function initProgression() {
  activeProfile = getActiveProfile();
  if (activeProfile.mode !== "progression") {
    renderNoRules();
    return;
  }
  currentRun = loadRun(activeProfile.id);
  if (!currentRun) {
    currentRun = newRun(MAINLINE_BOOSTERS);
    persistRun(currentRun);
  }
  renderRun();
  loadSetDates().then(() => {
    // Only redraw the rail's pictures/dates; never interrupt a pack being revealed.
    if ((!packReveal || packReveal.isComplete()) && (!extraReveal || extraReveal.isComplete())) renderRun();
  });
}

initProgression();

/* ---- Bought boosters ---- */

let pendingExtraFinish = null; // { run } when the backlog merge succeeded but the run could not be saved yet

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
        if (completeExtraPack()) renderRun();
      },
    };
  }
  return { label: "Done", onClick: renderRun };
}

function mountExtraPack() {
  const extra = getExtraPack(currentRun);
  // Cards already pulled from this pack (e.g. after a reload), newest first.
  extra.pack.cards
    .filter((_, i) => extra.pack.revealed[i])
    .reverse()
    .forEach((card) => extraStripEl.appendChild(buildRevealedCardElement(card)));
  let saved = false;
  extraReveal = createPackReveal(extraAreaEl, {
    pack: extra.pack,
    pulledStripEl: extraStripEl,
    actionSlotEl: extraActionEl,
    onReveal: (index) => {
      persistRun(revealInExtraPack(currentRun, index));
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
      renderRun();
    });
}
