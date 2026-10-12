function loadDeck() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deck));
  } catch (err) {
    console.warn("Could not save deck:", err);
  }
}

let deck = loadDeck();
let lastResults = [];
