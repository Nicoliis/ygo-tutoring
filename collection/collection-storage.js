function loadCollection() {
  try {
    const parsed = loadData(STORAGE_KEY);
    if (!parsed) return { cards: [], engines: [], decks: [], trackers: [] };
    const engines = Array.isArray(parsed.engines) ? parsed.engines : [];
    const decks = Array.isArray(parsed.decks) ? parsed.decks : [];
    decks.forEach((deck) => migrateDeckToSections(deck, engines));
    return {
      ...parsed,
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      engines,
      decks,
      trackers: Array.isArray(parsed.trackers) ? parsed.trackers : [],
    };
  } catch (err) {
    console.warn("Could not read saved collection:", err);
    return { cards: [], engines: [], decks: [], trackers: [] };
  }
}

function saveCollection() {
  saveData(collection, STORAGE_KEY);
}
