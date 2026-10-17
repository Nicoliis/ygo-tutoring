function addCard(card) {
  const images = card.card_images[0];
  deck.push({
    uid: nextId("c"),
    id: card.id,
    name: card.name,
    imageSmall: images.image_url_small,
    imageFull: images.image_url,
    marked: true,
  });

  saveDeck();
  renderDeck();
}

function toggleMark(uid) {
  const entry = deck.find((c) => c.uid === uid);
  if (!entry) return;
  entry.marked = !entry.marked;
  saveDeck();
  renderDeck();
}

function removeCard(uid) {
  deck = deck.filter((c) => c.uid !== uid);
  saveDeck();
  renderDeck();
}

markAllBtn.addEventListener("click", () => {
  if (deck.length === 0) return;
  deck.forEach((c) => (c.marked = true));
  saveDeck();
  renderDeck();
});

unmarkAllBtn.addEventListener("click", () => {
  if (deck.length === 0) return;
  deck.forEach((c) => (c.marked = false));
  saveDeck();
  renderDeck();
});

clearDeckBtn.addEventListener("click", async () => {
  if (deck.length === 0) return;
  const ok = await confirmDialog("Remove all cards from the deck?", { title: "Clear deck", confirmLabel: "Remove all" });
  if (!ok) return;
  deck = [];
  saveDeck();
  renderDeck();
});
