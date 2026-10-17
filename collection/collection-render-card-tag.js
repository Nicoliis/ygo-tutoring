function renderCardTag(card, { draggable = false, directDetails = false } = {}) {
  const el = buildCardTagElement(card, draggable);
  const hideHoverOverlay = wireCardTagHover(el, card);
  wireCardTagExpanded(el, card, hideHoverOverlay);
  wireCardTagClick(el, card, directDetails);
  return el;
}
