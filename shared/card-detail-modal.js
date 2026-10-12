function openCardDetailModal(card, buttons) {
  const imageHtml = card.imageFull
    ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
    : "";
  const tagsHtml = buildCardTagsHtml(card);
  const effectHtml = buildEffectHtml(card);
  const bodyHtml =
    imageHtml || tagsHtml || effectHtml
      ? `${imageHtml}${tagsHtml}${effectHtml}`
      : `<div>No further details available for this card.</div>`;

  showModal({
    title: card.name,
    bodyHtml,
    buttons: buttons || [{ label: "Close", primary: true }],
  });
}
