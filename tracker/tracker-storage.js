function loadCollection() {
  try {
    const parsed = loadData(STORAGE_KEY);
    if (!parsed) return { cards: [], engines: [], decks: [], trackers: [] };
    return {
      ...parsed,
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      engines: Array.isArray(parsed.engines) ? parsed.engines : [],
      decks: Array.isArray(parsed.decks) ? parsed.decks : [],
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

function findTracker(trackerId) {
  return collection.trackers.find((t) => t.id === trackerId) || null;
}
