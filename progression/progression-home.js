/*
 * Progression screen (screen 1): behaviour. Chooses the starting set of a new run, starts the stage's box (then goes
 * to the stage pull screen) and completes the stage after its duel. Drawing is in views/home-view.js; the shared state
 * is in progression-context.js.
 */
const DUEL_WON = "won";
const DUEL_LOST = "lost";
const STAGE_STATE_TEXT = { opened: "opened", next: "next to open", locked: "not reached yet", skipped: "skipped — buy its boosters in the Store" };
let chosenStart = null; // the set picked in the chooser, before it is confirmed

function looseBoosterCount(run) {
  return Object.values(run.packInventory || {}).reduce((sum, n) => sum + (n > 0 ? n : 0), 0);
}

function homeModel() {
  const run = currentRun;
  if (!run) {
    return {
      started: false,
      chosenStart,
      chooserBoosters: MAINLINE_BOOSTERS.map((name) => ({ name, label: stageLabel(name) })),
    };
  }
  const phase = run.current === null ? "finished" : boxPhase(run);
  return {
    started: true,
    summaryText: `${activeProfile.name} — ${runSummary(run, MAINLINE_BOOSTERS)} · ${countOwnedCards()} cards owned`,
    finished: run.current === null,
    stageHeading: run.current === null ? "" : `Current stage: ${stageLabel(run.current)}`,
    phase,
    startCheck: canOpenBox(run),
    completeCheck: canCompleteStage(run),
    hint: phase === "finished" ? canCompleteStage(run).reason : canOpenBox(run).reason,
    boosters: MAINLINE_BOOSTERS.map((name) => {
      const state = stageState(run, name, MAINLINE_BOOSTERS);
      return { name, state, label: `${stageLabel(name)} — ${STAGE_STATE_TEXT[state]}`, current: name === run.current };
    }),
    completed: run.completed.map(stageLabel),
    looseBoosterCount: looseBoosterCount(run),
  };
}

function drawHome() {
  renderHome(progressionRootEl, homeModel(), {
    onStartBox,
    onCompleteStage,
    onChooseStart: (name) => {
      chosenStart = name;
      drawHome();
    },
    onConfirmStart,
  });
}

/* Confirms the chosen starting set, then saves a run that begins there. */
async function onConfirmStart() {
  if (!chosenStart) return;
  const ok = await confirmDialog(`Start your run at "${chosenStart}"? This can't be undone.`, { title: "Start run", confirmLabel: "Start" });
  if (!ok) return;
  if (persistRun(newRun(MAINLINE_BOOSTERS, chosenStart))) setProgressionStatus("");
  drawHome();
}

/* Generates the first pack of the stage's box, saves it, then goes to the stage pull screen. */
async function onStartBox() {
  const check = canOpenBox(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  const ok = await confirmDialog(`Start the box for "${currentRun.current}"? This can't be undone.`, { title: "Start box", confirmLabel: "Start" });
  if (!ok || busy) return;
  busy = true;
  setProgressionStatus("Opening pack…");
  try {
    const cards = await generatePack(currentRun.current);
    if (!persistRun(startPack(currentRun, { cards }))) return;
    window.location.href = "stage.html";
  } catch (err) {
    console.warn("Could not open pack:", err);
    setProgressionStatus(OPEN_PACK_ERROR, true);
  } finally {
    busy = false;
  }
}

async function onCompleteStage() {
  const check = canCompleteStage(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  const leaving = currentRun.current;
  const result = await chooseDuelResult(leaving);
  if (result === null) return;
  const won = result === DUEL_WON;
  if (persistRun(completeStageWithDuel(currentRun, MAINLINE_BOOSTERS, won))) {
    setProgressionStatus(
      won
        ? `Duel won: ${formatMoney(STAGE_WIN_REWARD_CENTS)} added to your balance.`
        : `Duel lost: ${formatMoney(STAGE_LOSS_REWARD_CENTS)} and ${STAGE_LOSS_PACKS} × ${leaving} packs added.`
    );
  }
  drawHome();
}

/* Asks how the duel that completes the stage ended; resolves with DUEL_WON, DUEL_LOST, or null when cancelled. */
function chooseDuelResult(stageName) {
  return new Promise((resolve) => {
    showModal({
      title: "Complete stage",
      bodyHtml:
        `<p>How did the duel for <strong>${escapeHtml(stageName)}</strong> end? This can't be undone.</p>` +
        `<ul><li>Won: ${formatMoney(STAGE_WIN_REWARD_CENTS)} for your balance.</li>` +
        `<li>Lost: ${formatMoney(STAGE_LOSS_REWARD_CENTS)} and ${STAGE_LOSS_PACKS} packs of ${escapeHtml(stageName)}.</li></ul>`,
      buttons: [
        { label: "Cancel", onClick: () => resolve(null) },
        { label: "I lost the duel", onClick: () => resolve(DUEL_LOST) },
        { label: "I won the duel", primary: true, onClick: () => resolve(DUEL_WON) },
      ],
    });
  });
}

function initHome() {
  if (!initRunContext()) return;
  currentRun = loadRun(activeProfile.id); // no record yet: the run has not started and the chooser is shown
  drawHome();
  loadSetDates().then(drawHome); // pictures and dates for the booster list
}

initHome();
