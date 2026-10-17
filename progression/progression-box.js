/* Generates ONE pack of the set (rarity-ordered, rarest last). Rejects with no side effects if the pool can't be loaded. */
function generatePack(setName) {
  return fetchSetCardPool(setName).then((pool) => {
    if (!pool || pool.length === 0) throw new Error("That set has no cards to draw from.");
    const cards = [];
    const packSize = getBoosterSize(setName);
    for (let i = 0; i < packSize; i++) {
      const { weight, ...card } = weightedRandomPick(pool); // keeps every card field so details can be shown
      cards.push({ ...card, set: setName });
    }
    return sortPackByRarity(cards);
  });
}
