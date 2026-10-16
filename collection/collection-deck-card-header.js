function wireDeckCardHeader(el, deck, expanded) {
  const headerEl = el.querySelector(".bag-header");
  headerEl.addEventListener("click", (e) => {
    if (e.target.closest(".header-actions") || e.target.closest(".deck-name-input")) return;
    if (expandedDecks.has(deck.id)) expandedDecks.delete(deck.id);
    else expandedDecks.add(deck.id);
    renderDecks();
  });
  headerEl.addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      !e.target.closest(".header-actions") &&
      !e.target.closest(".deck-name-input")
    ) {
      e.preventDefault();
      headerEl.click();
    }
  });
  headerEl.tabIndex = 0;
  headerEl.setAttribute("role", "button");
  headerEl.setAttribute("aria-expanded", String(expanded));

  el.querySelector(".deck-name-input").addEventListener("click", (e) => e.stopPropagation());
  el.querySelector(".deck-name-input").addEventListener("change", (e) => {
    if (updateDeck(deck.id, { name: e.target.value })) renderDecks();
    else e.target.value = deck.name;
  });
}
