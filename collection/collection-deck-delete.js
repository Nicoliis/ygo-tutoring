function deleteDeck(deckId) {
  const deck = findDeck(deckId);
  if (!deck) return;

  showModal({
    title: "Delete deck?",
    bodyHtml: `<p>${escapeHtml(`Delete deck "${deck.name}"?`)}</p>`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Delete",
        primary: true,
        onClick: () => {
          collection.decks = collection.decks.filter((d) => d.id !== deckId);
          expandedDecks.delete(deckId);
          saveCollection();
          renderAll();
          showToast(`Deleted deck "${deck.name}".`, "success");
        },
      },
    ],
  });
}
