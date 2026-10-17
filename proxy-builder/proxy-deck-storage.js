function loadDeck() {
  try {
    const parsed = loadData(STORAGE_KEY);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => ({
      uid: entry.uid || nextId("c"),
      id: entry.id,
      name: entry.name,
      imageSmall: entry.imageSmall,
      imageFull: entry.imageFull,
      marked: entry.marked !== false,
    }));
  } catch (err) {
    console.warn("Could not read saved deck:", err);
    return [];
  }
}

function saveDeck() {
  saveData(deck, STORAGE_KEY);
}

let deck = loadDeck();
let lastResults = [];
