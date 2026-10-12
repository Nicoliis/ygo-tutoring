function fetchSetCardPool(setName) {
  if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
  isFetchingSetPool = true;
  renderTrackers();
  const url = `${SET_CARDS_URL}?cardset=${encodeURIComponent(setName)}`;
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((data) => {
      const cards = Array.isArray(data.data) ? data.data : [];
      const pool = cards.map((card) => {
        const sets = Array.isArray(card.card_sets) ? card.card_sets : [];
        const match = sets.find((s) => s.set_name === setName);
        return {
          name: card.name,
          weight: getWeightForRarity(match ? match.set_rarity : null),
          ...extractCardFields(card),
        };
      });
      setCardPoolCache.set(setName, pool);
      isFetchingSetPool = false;
      renderTrackers();
      return pool;
    })
    .catch((err) => {
      console.warn("Could not load set card pool:", err);
      isFetchingSetPool = false;
      renderTrackers();
      alert("Couldn't load that set's cards — check your connection and try again.");
      throw err;
    });
}
