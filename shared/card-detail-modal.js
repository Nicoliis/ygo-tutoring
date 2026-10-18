/* `extraHtml` (optional) is shown right under the picture, e.g. which printing of the card is being looked at. */
function openCardDetailModal(card, buttons, extraHtml = "") {
  const imageHtml = card.imageFull
    ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
    : "";
  const tagsHtml = buildCardTagsHtml(card);
  const effectHtml = buildEffectHtml(card);
  const inStore = document.body.dataset.area === "store";
  const printingsHtml = inStore
    ? (typeof buildPrintingsHtml === "function" ? "<hr class=\"card-divider\">" + buildPrintingsHtml(card, { showSet: true }) : "")
    : (typeof buildRarityCountsSectionHtml === "function" ? buildRarityCountsSectionHtml(card) : "");
  const bodyHtml =
    imageHtml || tagsHtml || effectHtml || printingsHtml
      ? `${imageHtml}${extraHtml}${tagsHtml}${effectHtml}${printingsHtml}`
      : `<div>No further details available for this card.</div>`;

  showModal({
    title: card.name,
    bodyHtml,
    buttons: buttons || [{ label: "Close", primary: true }],
  });
}
