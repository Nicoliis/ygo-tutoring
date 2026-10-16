function buildDeckCardElement(deck) {
  const expanded = expandedDecks.has(deck.id);
  const mainTotal = deck.main.reduce((s, it) => s + it.quantity, 0);
  const extraTotal = deck.extra.reduce((s, it) => s + it.quantity, 0);

  const el = document.createElement("div");
  el.className = "deck-card bag" + (expanded ? " expanded" : " collapsed");
  el.innerHTML = buildDeckCardHtml(deck, expanded, mainTotal, extraTotal);

  wireDeckCardHeader(el, deck, expanded);
  wireDeckCardActions(el, deck);
  if (expanded) renderDeckCardContents(el, deck);

  return el;
}

function renderDecks() {
  deckListEl.innerHTML = "";

  if (collection.decks.length === 0) {
    deckListEl.innerHTML = '<p class="empty-msg">No decks yet. Create one above.</p>';
    return;
  }

  collection.decks.forEach((deck) => {
    deckListEl.appendChild(buildDeckCardElement(deck));
  });
}
