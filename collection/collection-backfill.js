function maybeBackfillCardDetails(card) {
  const hasEffect = Boolean(card.effect || card.desc || card.pendDesc || card.monsterDesc);
  if (hasEffect || backfillAttemptedCardIds.has(card.id)) return;
  backfillAttemptedCardIds.add(card.id);
  const url = `${API_URL}?name=${encodeURIComponent(card.name)}`;
  fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const match = data && Array.isArray(data.data) ? data.data[0] : null;
      if (!match) return;
      const extracted = extractCardDataFromApiResult(match);
      let changed = false;
      Object.keys(extracted).forEach((key) => {
        if ((card[key] === undefined || card[key] === null) && extracted[key] !== null) {
          card[key] = extracted[key];
          changed = true;
        }
      });
      if (changed) {
        saveCollection();
        renderAll();
      }
    })
    .catch(() => {});
}
