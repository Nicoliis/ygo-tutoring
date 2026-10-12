function matchesTypeFilter(card) {
  const filter = typeFilter.value;
  if (filter === "all") return true;
  return card.type.toLowerCase().includes(filter.toLowerCase());
}

function renderResults(cards) {
  searchResults.innerHTML = "";
  const filtered = cards.filter(matchesTypeFilter);

  if (cards.length > 0 && filtered.length === 0) {
    searchResults.innerHTML = `<p class="empty-msg">No cards match the selected type filter.</p>`;
    return;
  }

  for (const card of filtered) {
    const images = card.card_images && card.card_images[0];
    if (!images) continue;

    const el = document.createElement("div");
    el.className = "result-card";
    el.title = `Add "${card.name}" to deck`;
    el.innerHTML = `
      <img src="${images.image_url_small}" alt="${escapeHtml(card.name)}" loading="lazy">
      <div class="result-name">${escapeHtml(card.name)}</div>
    `;
    el.addEventListener("click", () => addCard(card));
    searchResults.appendChild(el);
  }
}
