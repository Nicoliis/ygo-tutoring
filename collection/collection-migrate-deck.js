function migrateDeckToSections(deck, engines) {
  if (deck.main || deck.extra) return;
  const main = [];
  (deck.items || []).forEach((item) => {
    if (item.type === "card") {
      const existing = main.find((m) => m.cardId === item.cardId);
      if (existing) existing.quantity += item.quantity;
      else main.push({ cardId: item.cardId, quantity: item.quantity });
    } else if (item.type === "engine") {
      const engine = engines.find((e) => e.id === item.engineId);
      if (engine) {
        engine.cards.forEach((ec) => {
          const qty = ec.quantity * item.copies;
          const existing = main.find((m) => m.cardId === ec.cardId);
          if (existing) existing.quantity += qty;
          else main.push({ cardId: ec.cardId, quantity: qty });
        });
      }
    }
  });
  deck.main = main;
  deck.extra = [];
  delete deck.items;
}
