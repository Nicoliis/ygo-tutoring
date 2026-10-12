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
  el.appendChild(imageOverlay);
}
