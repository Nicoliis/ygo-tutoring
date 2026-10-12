function removeCardFromDeckSection(deckId, section, cardId, amount = 1, options = {}) {
  const deck = findDeck(deckId);
  if (!deck || (section !== "main" && section !== "extra")) return;
  const entry = deck[section].find((it) => it.cardId === cardId);
  if (!entry) return;
  const card = findCard(cardId);
  entry.quantity -= amount;
  if (entry.quantity <= 0) {
    deck[section] = deck[section].filter((it) => it.cardId !== cardId);
  }
  saveCollection();
  renderAll();
  if (!options.silent) {
    showToast(`Removed ${card ? card.name : "card"} from ${sectionLabel(section)}.`, "success");
  }
}
