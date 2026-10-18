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
          dragCardPayload: { engineId: engine.id },
        })
      );
    }
  });
}
