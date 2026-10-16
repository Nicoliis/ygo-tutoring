function wireDeckCardActions(el, deck) {
  el.querySelector(".btn-export").addEventListener("click", (e) => {
    e.stopPropagation();
    exportDeckAsYdk(deck.id);
  });
  el.querySelector(".btn-import").addEventListener("click", (e) => {
    e.stopPropagation();
    openImportModal(deck.id);
  });
  el.querySelector(".btn-delete-deck").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteDeck(deck.id);
  });
}
