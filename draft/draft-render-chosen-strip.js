function renderChosenStrip() {
  chosenStripEl.innerHTML = "";
  const sorted = session.keptCards.slice().sort((a, b) => a.name.localeCompare(b.name));
  sorted.forEach((card) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chosen-chip";
    chip.textContent = card.name + " ";
    chip.appendChild(buildRarityBadge(card.rarity));
    chip.setAttribute("aria-label", `${card.name}, ${rarityLabel(card.rarity)} — view details and engines`);
    chip.addEventListener("click", () => openCardDetailModal(card, undefined, "", draftContextFor(card)));
    chosenStripEl.appendChild(chip);
  });
}

chosenStripEl.addEventListener("dragover", (e) => {
  if (session.status !== "in-progress" || session.pickQueue.length === 0) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  chosenStripEl.classList.add("drag-over");
});
chosenStripEl.addEventListener("dragleave", () => {
  chosenStripEl.classList.remove("drag-over");
});
chosenStripEl.addEventListener("drop", (e) => {
  e.preventDefault();
  chosenStripEl.classList.remove("drag-over");
  if (session.status !== "in-progress" || session.pickQueue.length === 0) return;
  const index = Number(e.dataTransfer.getData("text/plain"));
  const group = session.pickQueue[0];
  if (!group || !Number.isInteger(index) || index < 0 || index >= group.cards.length) return;
  handlePick(group.cards[index]);
});
