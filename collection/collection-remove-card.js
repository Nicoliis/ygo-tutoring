function removeCard(cardId) {
  const card = findCard(cardId);
  if (!card) return;

  const engineRefs = collection.engines.filter((e) =>
    e.cards.some((c) => c.cardId === cardId)
  ).length;
  const deckRefs = collection.decks.filter(
    (d) => d.main.some((it) => it.cardId === cardId) || d.extra.some((it) => it.cardId === cardId)
  ).length;

  let message = `Remove "${card.name}" from your backlog?`;
  if (engineRefs > 0 || deckRefs > 0) {
    message += ` It is used in ${engineRefs} engine(s) and ${deckRefs} deck(s) — those references will be removed too.`;
  }

  showModal({
    title: "Remove card?",
    bodyHtml: `${cardImageHtml(card)}<p>${escapeHtml(message)}</p>`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Remove",
        primary: true,
        onClick: () => {
          collection.engines.forEach((e) => {
            e.cards = e.cards.filter((c) => c.cardId !== cardId);
          });
          collection.decks.forEach((d) => {
            d.main = d.main.filter((it) => it.cardId !== cardId);
            d.extra = d.extra.filter((it) => it.cardId !== cardId);
          });
          collection.cards = collection.cards.filter((c) => c.id !== cardId);
          if (expandedCardId === cardId) expandedCardId = null;
          saveCollection();
          renderAll();
          showToast(`Removed "${card.name}" from backlog.`, "success");
        },
      },
    ],
  });
}
