function buildPrintArea(cards) {
  printArea.innerHTML = "";

  for (let i = 0; i < cards.length; i += CARDS_PER_SHEET) {
    const chunk = cards.slice(i, i + CARDS_PER_SHEET);

    const sheet = document.createElement("div");
    sheet.className = "sheet";

    const grid = document.createElement("div");
    grid.className = "slot-grid";

    for (let s = 0; s < CARDS_PER_SHEET; s++) {
      const slot = document.createElement("div");
      slot.className = "slot";
      const entry = chunk[s];
      if (entry) {
        const img = document.createElement("img");
        img.src = entry.imageFull;
        img.alt = entry.name;
        slot.appendChild(img);
      }
      grid.appendChild(slot);
    }

    sheet.appendChild(grid);
    printArea.appendChild(sheet);
  }
}

printBtn.addEventListener("click", () => {
  const marked = deck.filter((c) => c.marked);
  if (marked.length === 0) {
    alert("Mark at least one card in the deck before printing.");
    return;
  }
  buildPrintArea(marked);
  requestAnimationFrame(() => window.print());
});
