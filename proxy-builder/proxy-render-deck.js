function renderDeck() {
  deckGridEl.innerHTML = "";

  if (deck.length === 0) {
    deckGridEl.innerHTML = `<p class="empty-msg">No cards added yet. Click a search result to add it to your deck.</p>`;
  }

  for (const entry of deck) {
    const tile = document.createElement("div");
    tile.className = "deck-tile" + (entry.marked ? " marked" : "");
    tile.title = entry.name;
    tile.innerHTML = `
      <img src="${entry.imageSmall}" alt="${escapeHtml(entry.name)}" loading="lazy">
      <button type="button" class="tile-remove" aria-label="Remove from deck">✕</button>
      <span class="mark-badge" aria-hidden="true">✓</span>
    `;

    tile.addEventListener("click", () => toggleMark(entry.uid));
    tile.querySelector(".tile-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      removeCard(entry.uid);
    });

    deckGridEl.appendChild(tile);
  }

  deckCountEl.textContent = String(deck.length);
  markedCountEl.textContent = String(deck.filter((c) => c.marked).length);
}
