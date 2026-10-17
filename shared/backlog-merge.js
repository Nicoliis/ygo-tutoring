/* Merges pulled cards into the ACTIVE profile's collection backlog. Returns false if the save failed. */
function mergeCardsIntoBacklog(cards) {
  const key = profileKey("ygoCollection");
  const blob = loadData(key) || {};
  const backlog = Array.isArray(blob.cards) ? blob.cards : [];
  cards.forEach((card) => {
    const trimmed = (card.name || "").trim();
    if (!trimmed) return;
    const existing = backlog.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    const extracted = {
      apiId: card.apiId,
      type: card.type,
      imageSmall: card.imageSmall,
      imageFull: card.imageFull,
      level: card.level,
      atk: card.atk,
      def: card.def,
    };
    if (existing) {
      existing.quantityOwned += 1;
      Object.keys(extracted).forEach((field) => {
        if ((existing[field] === undefined || existing[field] === null) && extracted[field] !== null && extracted[field] !== undefined) {
          existing[field] = extracted[field];
        }
      });
    } else {
      backlog.push({
        id: nextId("card"),
        name: trimmed,
        quantityOwned: 1,
        ...extracted,
      });
    }
  });
  return saveData({ ...blob, cards: backlog }, key);
}
