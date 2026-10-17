function wireCardTagExpanded(el, card, hideHoverOverlay) {
  if (expandedCardId !== card.id) return;
  el.classList.add("tag-expanded");
  hideHoverOverlay();
  const imageOverlay = document.createElement("div");
  imageOverlay.className = "card-tag-image-overlay";
  const imageHtml = card.imageSmall
    ? `<img src="${card.imageSmall}" alt="${escapeHtml(card.name)}">`
    : `<div class="card-tag-image-placeholder">No image available</div>`;
  imageOverlay.innerHTML = imageHtml + `<div class="card-tag-image-details">${buildKeyDetailsHtml(card)}</div>`;
  document.body.appendChild(imageOverlay);
  positionFloating(imageOverlay, el.getBoundingClientRect(), false);
  // The overlay lives on <body> (so the list cannot clip it); it is removed when the tag is drawn again or collapsed.
  imageOverlay.style.cursor = "pointer";
  imageOverlay.addEventListener("click", (e) => {
    e.stopPropagation();
    openCardDetailModal(card);
  });
  floatingOverlays.push(imageOverlay);
}
