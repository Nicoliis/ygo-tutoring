function openCardDetailModal(card, buttons) {
  maybeBackfillCardDetails(card);
  const view = { ...card, desc: card.desc || card.effect || null };
  const imageHtml = card.imageFull
    ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
    : `<div class="card-tag-image-placeholder">No image available</div>`;
  const tagsHtml = buildCardTagsHtml(view);
  const effectHtml = buildEffectHtml(view);
  const raritySectionHtml = typeof buildRarityCountsSectionHtml === "function" ? buildRarityCountsSectionHtml(card) : "";
  const hasInfo = tagsHtml || effectHtml;

  showModal({
    title: card.name,
    bodyHtml: `${imageHtml}${hasInfo ? tagsHtml + effectHtml : "<div>No further details available for this card.</div>"}${raritySectionHtml}`,
    buttons: buttons || [{ label: "Close", primary: true }],
  });
}
