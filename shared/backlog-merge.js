/*
 * Merges pulled cards ({ name, set, rarity, price, ...card fields }) into the ACTIVE profile's
 * collection. quantityOwned goes up by 1 per pulled card and the printing (set + rarity) is recorded.
 * Returns false if the save failed.
 */
function mergeCardsIntoBacklog(cards) {
  const key = profileKey("ygoCollection");
  const blob = loadData(key) || {};
  const backlog = Array.isArray(blob.cards) ? blob.cards : [];
  cards.forEach((card) => {
    const trimmed = (card.name || "").trim();
    if (!trimmed) return;
    let owned = backlog.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    const extracted = {
      apiId: card.apiId,
      type: card.type,
      imageSmall: card.imageSmall,
      imageFull: card.imageFull,
      level: card.level,
      atk: card.atk,
      def: card.def,
    };
    if (owned) {
      owned.quantityOwned += 1;
      Object.keys(extracted).forEach((field) => {
        if ((owned[field] === undefined || owned[field] === null) && extracted[field] !== null && extracted[field] !== undefined) {
          owned[field] = extracted[field];
        }
      });
    } else {
      owned = {
        id: nextId("card"),
        name: trimmed,
        quantityOwned: 1,
        ...extracted,
      };
      backlog.push(owned);
    }
    addPrinting(owned, { set: card.set, rarity: card.rarity, price: card.price });
  });
  return saveData({ ...blob, cards: backlog }, key);
}
