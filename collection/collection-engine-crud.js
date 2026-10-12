function createEngine(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    showToast("Enter an engine name.", "warning");
    return false;
  }
  collection.engines.push({ id: nextId("engine"), name: trimmed, cards: [] });
  saveCollection();
  return true;
}

function updateEngine(engineId, changes) {
  const engine = findEngine(engineId);
  if (!engine) return false;

  if (changes.name !== undefined) {
    const trimmed = (changes.name || "").trim();
    if (!trimmed) {
      showToast("Enter an engine name.", "warning");
      return false;
    }
    engine.name = trimmed;
  }

  if (changes.cards !== undefined) {
    const validated = validateCardEntries(changes.cards);
    if (!validated) {
      showToast("Could not update this engine's cards.", "error");
      return false;
    }
    engine.cards = validated;
  }

  saveCollection();
  return true;
}
