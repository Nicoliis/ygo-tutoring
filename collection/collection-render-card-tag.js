function renderCardTag(card, { draggable = false } = {}) {
  const el = buildCardTagElement(card, draggable);
  const hideHoverOverlay = wireCardTagHover(el, card);
  wireCardTagExpanded(el, card, hideHoverOverlay);
  wireCardTagClick(el, card);
  return el;
}
