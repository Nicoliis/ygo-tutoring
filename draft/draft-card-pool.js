function fetchSetCardPool(setName) {
  if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
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
        const rarity = match ? match.set_rarity : null;
        return {
          name: card.name,
          rarity,
          weight: getWeightForRarity(rarity),
          price: parsePrice(card),
          ...extractCardFields(card),
        };
      });
      setCardPoolCache.set(setName, pool);
      return pool;
    })
    .catch((err) => {
      console.warn("Could not load set card pool:", err);
      showConfigStatus("Couldn't load that set's cards — check your connection and try again.", true);
      throw err;
    });
}
