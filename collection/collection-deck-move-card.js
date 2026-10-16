function moveCardIntoSection(deck, targetSection, payload) {
  if (payload.fromDeckId === deck.id && payload.fromSection === targetSection) return;
  if (!addCardToDeckSection(deck.id, targetSection, payload.cardId, 1)) return;
  removeCardFromDeckSection(payload.fromDeckId, payload.fromSection, payload.cardId, 1, { silent: true });
  const card = findCard(payload.cardId);
  showToast(`Moved ${card ? card.name : "card"} to ${sectionLabel(targetSection)}.`, "success");
}
