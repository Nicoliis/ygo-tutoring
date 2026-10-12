function cardImageHtml(card) {
  return card.imageSmall
    ? `<img src="${card.imageSmall}" alt="${escapeHtml(card.name)}">`
    : "";
}
