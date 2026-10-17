function addEngineToDeckSection(deckId, section, engineId) {
  const deck = findDeck(deckId);
  const engine = findEngine(engineId);
  if (!deck || !engine || (section !== "main" && section !== "extra")) return false;
  if (engine.cards.length === 0) return false;
  const list = deck[section];
  let addedAny = false;
  const skipped = [];
  engine.cards.forEach((ec) => {
    const card = findCard(ec.cardId);
    if (!card) return;
    const existing = list.find((it) => it.cardId === ec.cardId);
    const currentQty = existing ? existing.quantity : 0;
    const allowed = Math.max(0, Math.min(ec.quantity, maxAllowedInGroup(card) - currentQty));
    if (allowed < ec.quantity) skipped.push(card.name);
    if (allowed === 0) return;
    if (existing) existing.quantity += allowed;
    else list.push({ cardId: ec.cardId, quantity: allowed });
    addedAny = true;
  });
  if (!addedAny) {
    showToast(`Every card in "${engine.name}" is already at its limit in ${sectionLabel(section)}.`, "warning");
    return false;
  }
  saveCollection();
  if (skipped.length > 0) {
    showToast(`Skipped or reduced (owned copies or the limit of 3 per section): ${skipped.join(", ")}.`, "warning");
  }
  return true;
}
