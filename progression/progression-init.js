function persistRun(run) {
  if (!saveRun(activeProfile.id, run)) {
    setProgressionStatus("Couldn't save your progress — browser storage is unavailable or full.", true);
    return false;
  }
  currentRun = run;
  return true;
}

function onOpenBox() {
  const check = canOpenBox(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  if (!confirm(`Open the box for "${currentRun.current}"? This can't be undone.`)) return;
  busy = true;
  setProgressionStatus("Opening box…");
  renderRun();
  openBox(currentRun.current)
    .then((cards) => {
      if (!mergeCardsIntoBacklog(cards)) throw new Error("save-failed");
      if (!persistRun(openBoxApplied(currentRun))) return;
      setProgressionStatus(`Box opened: ${cards.length} cards added to your backlog.`);
    })
    .catch((err) => {
      console.warn("Could not open box:", err);
      setProgressionStatus(
        err.message === "save-failed"
          ? "Couldn't save to your backlog — browser storage is unavailable or full."
          : "Couldn't open the box — check your connection and try again.",
        true
      );
    })
    .finally(() => {
      busy = false;
      renderRun();
    });
}

function onCompleteStage() {
  const check = canCompleteStage(currentRun);
  if (!check.ok) {
    setProgressionStatus(check.reason, true);
    return;
  }
  if (!confirm(`Complete "${currentRun.current}" and move to the next booster? This can't be undone.`)) return;
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
  loadSetDates().then(renderRun);
}

initProgression();
