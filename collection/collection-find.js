function findCard(cardId) {
  return collection.cards.find((c) => c.id === cardId) || null;
}

function findEngine(engineId) {
  return collection.engines.find((e) => e.id === engineId) || null;
}

function findDeck(deckId) {
  return collection.decks.find((d) => d.id === deckId) || null;
}
