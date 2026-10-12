function addKeptCardsToBacklog(keptCards) {
  const blob = loadBacklogBlob();
  keptCards.forEach((card) => {
    const trimmed = (card.name || "").trim();
    if (!trimmed) return;
    const existing = blob.cards.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
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
      Object.keys(extracted).forEach((key) => {
        if ((existing[key] === undefined || existing[key] === null) && extracted[key] !== null && extracted[key] !== undefined) {
          existing[key] = extracted[key];
        }
      });
    } else {
      blob.cards.push({
        id: nextId("card"),
        name: trimmed,
        quantityOwned: 1,
        ...extracted,
      });
    }
  });
  saveBacklogBlob(blob);
}

addToBacklogBtn.addEventListener("click", () => {
  addKeptCardsToBacklog(session.keptCards);
  resetSession();
});
