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

/*
 * The Backlog's remove button: takes away ONE copy. The card only leaves the backlog when its last copy goes
 * (that case is the full removal above, with its confirmation). Taking a copy that an engine or deck still needs
 * asks first and then reduces those to the copies that are left.
 */
function removeBacklogCopy(cardId) {
  const card = findCard(cardId);
  if (!card) return;
  if (card.quantityOwned <= 1) {
    removeCard(cardId);
    return;
  }
  const affected = allocationsOverLimit(collection, cardId, card.quantityOwned - 1);
  const apply = () => {
    removeOneCopy(card);
    clampAllocationsToOwned(collection);
    saveCollection();
    renderAll();
    showToast(`Removed a copy of "${card.name}" (${card.quantityOwned} left).`, "success");
  };
  if (affected.length === 0) {
    apply();
    return;
  }
  showModal({
    title: "Remove a copy?",
    bodyHtml: `${cardImageHtml(card)}<p>${escapeHtml(`"${card.name}" is used in ${affected.join(", ")}. Removing a copy reduces those to the copies you will still own.`)}</p>`,
    buttons: [{ label: "Cancel" }, { label: "Remove copy", primary: true, onClick: apply }],
  });
}
