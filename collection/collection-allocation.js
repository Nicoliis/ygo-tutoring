// The standard trading-card-game limit: no single group (an engine, or one deck section) may
// hold more copies of a card than are owned, or more than 3 — whichever is smaller.
function maxAllowedInGroup(card) {
  return Math.max(0, Math.min(card.quantityOwned, 3));
}

/*
 * Groups (engine card lists, deck main/extra) that would hold more copies of `cardId` than would be allowed
 * if the card were owned `newOwned` times. Used to warn before selling. Pure: does not change anything.
 */
function allocationsOverLimit(collection, cardId, newOwned) {
  const limit = Math.max(0, Math.min(newOwned, 3));
  const over = [];
  (collection.engines || []).forEach((engine) => {
    (engine.cards || []).forEach((entry) => {
      if (entry.cardId === cardId && entry.quantity > limit) over.push(`engine "${engine.name}"`);
    });
  });
  (collection.decks || []).forEach((deck) => {
    ["main", "extra"].forEach((section) => {
      (deck[section] || []).forEach((entry) => {
        if (entry.cardId === cardId && entry.quantity > limit) over.push(`deck "${deck.name}" (${section})`);
      });
    });
  });
  return over;
}

/* Reduces every engine/deck entry to what the owned quantity allows, dropping entries that reach 0. Returns how many were reduced. */
function clampAllocationsToOwned(collection) {
  let reduced = 0;
  const ownedById = new Map((collection.cards || []).map((c) => [c.id, Math.max(0, Math.min(c.quantityOwned, 3))]));
  const clampList = (list) =>
    (list || []).reduce((kept, entry) => {
      const limit = ownedById.has(entry.cardId) ? ownedById.get(entry.cardId) : entry.quantity;
      if (entry.quantity > limit) {
        reduced += 1;
        if (limit > 0) kept.push({ ...entry, quantity: limit });
      } else {
        kept.push(entry);
      }
      return kept;
    }, []);
  (collection.engines || []).forEach((engine) => {
    engine.cards = clampList(engine.cards);
  });
  (collection.decks || []).forEach((deck) => {
    deck.main = clampList(deck.main);
    deck.extra = clampList(deck.extra);
  });
  return reduced;
}
