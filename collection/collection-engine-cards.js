function addCardToEngine(engineId, cardId, quantity) {
  const engine = findEngine(engineId);
  const card = findCard(cardId);
  if (!engine || !card) return false;
  const qty = parsePositiveInt(quantity);
  if (qty === null) return false;
  const updatedCards = engine.cards.map((c) => ({ ...c }));
  const existing = updatedCards.find((c) => c.cardId === cardId);
  const currentQty = existing ? existing.quantity : 0;
  const allowed = Math.max(0, Math.min(qty, maxAllowedInGroup(card) - currentQty));
  if (allowed === 0) {
    showToast(`"${card.name}" is already at its limit (${maxAllowedInGroup(card)}) in "${engine.name}".`, "warning");
    return false;
  }
  if (existing) existing.quantity += allowed;
  else updatedCards.push({ cardId, quantity: allowed });
  return updateEngine(engineId, { cards: updatedCards });
}

function removeCardFromEngine(engineId, cardId, amount = 1) {
  const engine = findEngine(engineId);
  if (!engine) return;
  const entry = engine.cards.find((c) => c.cardId === cardId);
  if (!entry) return;
  const card = findCard(cardId);
  entry.quantity -= amount;
  if (entry.quantity <= 0) {
    engine.cards = engine.cards.filter((c) => c.cardId !== cardId);
  }
  saveCollection();
  renderAll();
  showToast(`Removed ${card ? card.name : "card"} from "${engine.name}".`, "success");
}
