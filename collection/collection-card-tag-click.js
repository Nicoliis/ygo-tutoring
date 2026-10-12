function wireCardTagClick(el, card) {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    maybeBackfillCardDetails(card);
    if (expandedCardId === card.id) {
      openCardDetailModal(card);
    } else {
      expandedCardId = card.id;
      renderAll();
    }
  });

  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      el.click();
    }
  });
}
