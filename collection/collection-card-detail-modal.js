function openCardDetailModal(card) {
  const imageHtml = card.imageFull
    ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
    : `<div class="card-tag-image-placeholder">No image available</div>`;
  const detailLines = [];
  if (card.type) detailLines.push(`<div><strong>Type:</strong> ${escapeHtml(card.type)}</div>`);
  if (card.level != null) detailLines.push(`<div><strong>Level/Rank:</strong> ${card.level}</div>`);
  if (card.atk != null) detailLines.push(`<div><strong>ATK:</strong> ${card.atk}</div>`);
  if (card.def != null) detailLines.push(`<div><strong>DEF:</strong> ${card.def}</div>`);
  if (detailLines.length === 0) {
    detailLines.push(`<div>No further details available for this card.</div>`);
  }
  const effectHtml = card.effect ? `<div class="card-effect">${escapeHtml(card.effect)}</div>` : "";
  const printingsHtml = typeof buildPrintingsHtml === "function" ? buildPrintingsHtml(card) : "";

  showModal({
    title: card.name,
    bodyHtml: `${imageHtml}${detailLines.join("")}${printingsHtml}${effectHtml}`,
    buttons: [{ label: "Close", primary: true }],
  });
}
