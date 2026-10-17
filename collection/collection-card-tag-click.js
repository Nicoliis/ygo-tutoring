// directDetails (Backlog tags): one click opens the details window; no expanded-image step.
function wireCardTagClick(el, card, directDetails = false) {
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFloatingOverlays(); // floating previews sit above the modal backdrop, so drop them first
    maybeBackfillCardDetails(card);
    if (directDetails) {
      openCardDetailModal(card);
      return;
    }
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
