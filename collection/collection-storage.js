function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cards: [], engines: [], decks: [], trackers: [] };
    const parsed = JSON.parse(raw);
    const engines = Array.isArray(parsed.engines) ? parsed.engines : [];
    const decks = Array.isArray(parsed.decks) ? parsed.decks : [];
    decks.forEach((deck) => migrateDeckToSections(deck, engines));
    return {
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  } catch (err) {
    console.warn("Could not save collection:", err);
  }
}
