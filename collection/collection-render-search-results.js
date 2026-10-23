/* Hand Test: each result shows the rarity and set it will be added with (the card's first listed set). */
function firstSetLineHtml(apiCard) {
  if (!recordsFirstSetPrinting()) return "";
  const first = cardFromFirstSet(apiCard);
  const text = first.set ? `${rarityLabel(first.rarity)} · ${first.setCode || first.set}` : "No set listed";
  return `<span class="search-result-set">${escapeHtml(text)}</span>`;
}

function renderSearchResults(cards) {
  cardSearchResultsEl.innerHTML = "";
  if (cards.length === 0) return;

  cards.forEach((apiCard) => {
    const images = apiCard.card_images && apiCard.card_images[0];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-result-card";
    btn.innerHTML = `
      ${images ? `<img src="${images.image_url_small}" alt="" loading="lazy">` : '<span class="search-result-noimg">No image</span>'}
      <span class="search-result-name">${escapeHtml(apiCard.name)}</span>
      ${firstSetLineHtml(apiCard)}
    `;
    btn.addEventListener("click", () => {
      if (addOrIncrementCardFromSearchResult(apiCard)) {
        renderAll();
        const first = recordsFirstSetPrinting() ? cardFromFirstSet(apiCard) : null;
        const detail = first && first.set ? ` (${rarityLabel(first.rarity)} · ${first.setCode || first.set})` : "";
        cardSearchStatus.textContent = `Added "${apiCard.name}"${detail} to the backlog.`;
        showToast(`Added "${apiCard.name}"${detail} to backlog.`, "success");
      }
    });
    cardSearchResultsEl.appendChild(btn);
  });
}
