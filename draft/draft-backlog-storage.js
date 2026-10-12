function loadBacklogBlob() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cards: [], engines: [], decks: [], trackers: [] };
    const parsed = JSON.parse(raw);
    return {
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

function saveBacklogBlob(blob) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch (err) {
    console.warn("Could not save collection:", err);
  }
}
