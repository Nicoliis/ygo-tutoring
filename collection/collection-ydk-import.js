function importYdkIntoDeck(deckId, text) {
  const deck = findDeck(deckId);
  if (!deck) return;

  const parsed = parseYdkText(text);
  if (!parsed || (parsed.main.length === 0 && parsed.extra.length === 0)) {
    showToast("That doesn't look like valid YDK text — nothing was imported.", "error");
    return;
  }

  const skipped = [];
  function resolveSection(passcodes) {
    const list = [];
    passcodes.forEach((passcode) => {
      const card = collection.cards.find((c) => c.apiId != null && String(c.apiId) === passcode);
      if (!card) {
        if (!skipped.includes(passcode)) skipped.push(passcode);
        return;
      }
      const existing = list.find((it) => it.cardId === card.id);
      if (existing) existing.quantity += 1;
      else list.push({ cardId: card.id, quantity: 1 });
    });
    return list;
  }

  deck.main = resolveSection(parsed.main);
  deck.extra = resolveSection(parsed.extra);
  saveCollection();
  renderAll();

  if (skipped.length > 0) {
    showToast(
      `Imported. ${skipped.length} card id(s) were not found in your backlog and were skipped: ${skipped.join(", ")}`,
      "warning"
    );
  } else {
    showToast(`Imported "${deck.name}" successfully.`, "success");
  }
}
