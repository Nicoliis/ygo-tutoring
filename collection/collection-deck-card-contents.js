function renderDeckCardContents(el, deck) {
  const mainListEl = el.querySelector(".deck-main-list");
  const extraListEl = el.querySelector(".deck-extra-list");
  renderDeckSectionCards(mainListEl, deck.id, "main", deck.main, deck.name);
  renderDeckSectionCards(extraListEl, deck.id, "extra", deck.extra, deck.name);

  const sectionEls = el.querySelectorAll(".deck-section");
  wireAddDropZone(
    sectionEls[0],
    (cardId) => {
      if (addCardToDeckSection(deck.id, "main", cardId, 1)) renderAll();
    },
    (payload) => {
      if (payload.engineId && addEngineToDeckSection(deck.id, "main", payload.engineId)) renderAll();
    },
    (payload) => moveCardIntoSection(deck, "main", payload)
  );
  wireAddDropZone(
    sectionEls[1],
    (cardId) => {
      if (addCardToDeckSection(deck.id, "extra", cardId, 1)) renderAll();
    },
    (payload) => {
      if (payload.engineId && addEngineToDeckSection(deck.id, "extra", payload.engineId)) renderAll();
    },
    (payload) => moveCardIntoSection(deck, "extra", payload)
  );
}
