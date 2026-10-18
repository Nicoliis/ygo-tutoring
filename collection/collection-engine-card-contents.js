function renderEngineCardContents(el, engine) {
  const contentsEl = el.querySelector(".engine-card-contents");
  engine.cards.forEach((ec) => {
    const card = findCard(ec.cardId);
    if (!card) {
      const wrapper = document.createElement("div");
      wrapper.className = "card-tag-row";
      const span = document.createElement("span");
      span.textContent = "(removed card)";
      wrapper.appendChild(span);
      contentsEl.appendChild(wrapper);
      return;
    }
    for (let i = 0; i < ec.quantity; i++) {
      contentsEl.appendChild(
        renderCardTile(card, {
          onRemove: () => removeCardFromEngine(engine.id, ec.cardId, 1),
          removeLabel: `Remove one ${card.name} from ${engine.name}`,
          dragCardPayload: { engineId: engine.id, cardId: ec.cardId },
          // dropping another card of this same engine here re-sorts the list; anything else goes on to the engine
          onSortDrop: (payload) => {
            if (payload.engineId !== engine.id) return false;
            if (payload.cardId !== ec.cardId) reorderEngineCards(engine.id, payload.cardId, ec.cardId);
            return true;
          },
        })
      );
    }
  });
}
