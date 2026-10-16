function renderDeckSectionCards(containerEl, deckId, section, entries, deckName) {
  containerEl.innerHTML = "";
  if (entries.length === 0) {
    containerEl.innerHTML = '<p class="empty-msg">No cards yet.</p>';
    return;
  }
  const label = sectionLabel(section);
  entries.forEach((entry) => {
    const card = findCard(entry.cardId);
    if (!card) {
      const wrapper = document.createElement("div");
      wrapper.className = "card-tag-row";
      const span = document.createElement("span");
      span.textContent = "(removed card)";
      wrapper.appendChild(span);
      containerEl.appendChild(wrapper);
      return;
    }
    for (let i = 0; i < entry.quantity; i++) {
      containerEl.appendChild(
        renderCardTile(card, {
          onRemove: () => removeCardFromDeckSection(deckId, section, entry.cardId, 1),
          removeLabel: `Remove one ${card.name} from ${label} of ${deckName}`,
          dragMovePayload: { cardId: entry.cardId, fromDeckId: deckId, fromSection: section },
        })
      );
    }
  });
}
