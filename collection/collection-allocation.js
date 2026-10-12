// The standard trading-card-game limit: no single group (an engine, or one deck section) may
// hold more copies of a card than are owned, or more than 3 — whichever is smaller.
function maxAllowedInGroup(card) {
  return Math.max(0, Math.min(card.quantityOwned, 3));
}
