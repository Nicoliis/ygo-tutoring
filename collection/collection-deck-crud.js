function sectionLabel(section) {
  return section === "main" ? "Main Deck" : "Extra Deck";
}

function createDeck(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    showToast("Enter a deck name.", "warning");
    return false;
  }
  collection.decks.push({ id: nextId("deck"), name: trimmed, main: [], extra: [] });
  saveCollection();
  return true;
}

function updateDeck(deckId, changes) {
  const deck = findDeck(deckId);
  if (!deck) return false;
  if (changes.name !== undefined) {
    const trimmed = (changes.name || "").trim();
    if (!trimmed) {
      showToast("Enter a deck name.", "warning");
      return false;
    }
    deck.name = trimmed;
  }
  saveCollection();
  return true;
}
