function addCardToDeckSection(deckId, section, cardId, quantity) {
  const deck = findDeck(deckId);
  const card = findCard(cardId);
  if (!deck || (section !== "main" && section !== "extra") || !card) return false;
  const qty = parsePositiveInt(quantity);
  if (qty === null) return false;
  const list = deck[section];
  const existing = list.find((it) => it.cardId === cardId);
  const currentQty = existing ? existing.quantity : 0;
  const allowed = Math.max(0, Math.min(qty, maxAllowedInGroup(card) - currentQty));
  if (allowed === 0) {
    showToast(`"${card.name}" is already at its limit (${maxAllowedInGroup(card)}) in ${sectionLabel(section)}.`, "warning");
    return false;
  }
  if (existing) existing.quantity += allowed;
  else list.push({ cardId, quantity: allowed });
  saveCollection();
  return true;
}
