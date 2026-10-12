function wireTrackerCardSimulate(el, tracker, pending) {
  const simulateBtn = el.querySelector(".btn-simulate-pull");
  if (!simulateBtn.disabled) {
    const packCountInput = el.querySelector(".simulate-pack-count");
    simulateBtn.addEventListener("click", () => {
      startPendingPull(tracker.id, selectedSetName, packCountInput.value);
    });
  }

  if (!pending) return;

  const minicardListEl = el.querySelector(".minicard-list");
  const sortedPulledCards = pending.packs
    .flat()
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  sortedPulledCards.forEach((card) => {
    minicardListEl.appendChild(renderMinicard(card));
  });

  el.querySelector(".btn-save-pull").addEventListener("click", () => {
    savePendingPull(tracker.id);
  });
  el.querySelector(".btn-reattempt-pull").addEventListener("click", () => {
    reattemptPendingPull(tracker.id);
  });
  el.querySelector(".btn-discard-pull").addEventListener("click", () => {
    discardPendingPull(tracker.id);
  });
}
