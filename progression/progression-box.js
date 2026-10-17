const BOX_PACKS = 24;

/* Generates one box (24 packs). Rejects with no side effects if the card pool can't be loaded. */
function openBox(setName) {
  return fetchSetCardPool(setName).then((pool) => {
    if (!pool || pool.length === 0) throw new Error("That set has no cards to draw from.");
    const cardsPerPack = getBoosterSize(setName);
    const cards = [];
    for (let i = 0; i < BOX_PACKS * cardsPerPack; i++) cards.push(weightedRandomPick(pool));
    return cards;
  });
}
