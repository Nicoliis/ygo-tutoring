function validateCardEntries(cardEntries) {
  const seen = new Map();
  for (const entry of cardEntries || []) {
    const qty = parsePositiveInt(entry.quantity);
    if (qty === null) return null;
    if (!findCard(entry.cardId)) return null;
    seen.set(entry.cardId, qty);
  }
  return Array.from(seen.entries()).map(([cardId, quantity]) => ({ cardId, quantity }));
}
