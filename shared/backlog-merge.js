/*
 * Merges pulled cards ({ name, set, rarity, price, ...card fields }) into the ACTIVE profile's
 * collection. quantityOwned goes up by 1 per pulled card and the printing (set + rarity) is recorded.
 * Cards flagged `savedEarly` were already saved from the card details window and are skipped.
 * Returns false if the save failed.
 */
function mergeCardsIntoBacklog(cards) {
  const key = profileKey("ygoCollection");
  const blob = loadData(key) || {};
  const backlog = Array.isArray(blob.cards) ? blob.cards : [];
  cards.forEach((card) => {
    if (card.savedEarly) return;
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
      humanReadableCardType: card.humanReadableCardType,
      frameType: card.frameType,
      race: card.race,
      attribute: card.attribute,
      archetype: card.archetype,
      effect: card.desc,
      pendDesc: card.pendDesc,
      monsterDesc: card.monsterDesc,
      scale: card.scale,
      linkval: card.linkval,
      linkmarkers: card.linkmarkers,
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
    addPrinting(owned, { set: card.set, rarity: card.rarity, price: card.price, setPrice: card.setPrice, setCode: card.setCode });
  });
  return saveData({ ...blob, cards: backlog }, key);
}

/* Takes back one copy saved by mergeCardsIntoBacklog (its quantity and printing); true when stored. */
function unmergeCardFromBacklog(card) {
  const key = profileKey("ygoCollection");
  const blob = loadData(key) || {};
  const backlog = Array.isArray(blob.cards) ? blob.cards : [];
  const name = (card.name || "").trim().toLowerCase();
  const owned = backlog.find((c) => c.name.toLowerCase() === name);
  if (!owned) return true;
  const printings = Array.isArray(owned.printings) ? owned.printings : [];
  const printing = printings.find((p) => p.set === card.set && (p.rarity || null) === (card.rarity || null));
  if (printing) {
    printing.quantity -= 1;
    if (printing.quantity <= 0) owned.printings = printings.filter((p) => p !== printing);
  }
  owned.quantityOwned -= 1;
  const kept = owned.quantityOwned <= 0 ? backlog.filter((c) => c !== owned) : backlog;
  return saveData({ ...blob, cards: kept }, key);
}
