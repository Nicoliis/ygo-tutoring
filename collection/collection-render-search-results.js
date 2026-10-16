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
    `;
    btn.addEventListener("click", () => {
      if (addOrIncrementCardFromSearchResult(apiCard)) {
        renderAll();
        cardSearchStatus.textContent = `Added "${apiCard.name}" to the backlog.`;
        showToast(`Added "${apiCard.name}" to backlog.`, "success");
      }
    });
    cardSearchResultsEl.appendChild(btn);
  });
}
