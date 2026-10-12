function addOrIncrementCard(name, quantity) {
  const trimmed = (name || "").trim();
  if (!trimmed) return false;
  const n = Math.floor(Number(quantity));
  const amount = Number.isFinite(n) && n >= 1 ? n : 1;
  const existing = collection.cards.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    existing.quantityOwned += amount;
  } else {
    collection.cards.push({ id: nextId("card"), name: trimmed, quantityOwned: amount });
  }
  return true;
}
