startDraftBtn.addEventListener("click", () => {
  const error = validateConfig();
  if (error) {
    showConfigStatus(error, true);
    return;
  }
  showConfigStatus("");
  session.amount = Math.floor(Number(amountInput.value));
  session.cardpool = Math.floor(Number(cardpoolInput.value));
  session.grouping = groupingSelect.value;
  session.status = "in-progress";
  renderConfigLockState();

  fetchSetCardPool(session.setName).then((pool) => {
    if (!pool || pool.length === 0) {
      showConfigStatus("That set has no cards to draw from.", true);
      session.status = "configuring";
      renderConfigLockState();
      return;
    }
    let allGroups = [];
    for (let b = 0; b < session.amount; b++) {
      const boosterCards = [];
      for (let i = 0; i < session.boosterSize; i++) {
        boosterCards.push(weightedRandomPick(pool));
      }
      const groups = buildPickGroupsForBooster(boosterCards, session.cardpool, session.grouping).map(
        (cards) => ({ boosterIndex: b, cards })
      );
      allGroups = allGroups.concat(groups);
    }
    session.pickQueue = allGroups;
    draftSection.hidden = false;
    renderAll();
  }).catch((err) => {
    console.warn("Could not load set card pool:", err);
    showConfigStatus("Couldn't load that set's cards — check your connection and try again.", true);
    session.status = "configuring";
    renderConfigLockState();
  });
});
