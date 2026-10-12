function addOrIncrementCardFromSearchResult(apiCard) {
  const trimmed = (apiCard.name || "").trim();
  if (!trimmed) return false;
  const extracted = extractCardDataFromApiResult(apiCard);
  const existing = collection.cards.find(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (existing) {
    existing.quantityOwned += 1;
    Object.keys(extracted).forEach((key) => {
      if ((existing[key] === undefined || existing[key] === null) && extracted[key] !== null) {
        existing[key] = extracted[key];
      }
    });
  } else {
    collection.cards.push({
      id: nextId("card"),
      name: trimmed,
      quantityOwned: 1,
      ...extracted,
    });
  }
  saveCollection();
  return true;
}
