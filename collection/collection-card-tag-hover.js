function wireCardTagHover(el, card) {
  let hoverOverlay = null;

  function hideHoverOverlay() {
    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
  }

  function showHoverOverlay() {
    if (expandedCardId === card.id) return;
    maybeBackfillCardDetails(card);
    hideHoverOverlay();
    hoverOverlay = document.createElement("div");
    hoverOverlay.className = "card-tag-hover-overlay";
    hoverOverlay.innerHTML = buildKeyDetailsHtml(card);
    el.appendChild(hoverOverlay);
  }

  el.addEventListener("mouseenter", showHoverOverlay);
  el.addEventListener("mouseleave", hideHoverOverlay);
  el.addEventListener("focus", showHoverOverlay);
  el.addEventListener("blur", hideHoverOverlay);

  return hideHoverOverlay;
}
