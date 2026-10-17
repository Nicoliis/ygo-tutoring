// The database search only exists when the Backlog panel was mounted with allowAdd.
if (cardSearchInput) {
  cardSearchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const query = cardSearchInput.value.trim();

    if (query.length < SEARCH_MIN_LEN) {
      renderSearchResults([]);
      cardSearchStatus.textContent =
        query.length === 0 ? "" : `Type at least ${SEARCH_MIN_LEN} characters to search.`;
      cardSearchStatus.classList.remove("error");
      return;
    }

    searchTimer = setTimeout(() => runCardSearch(query), SEARCH_DEBOUNCE_MS);
  });
}

backlogSearchInput.addEventListener("input", () => {
  backlogFilter = backlogSearchInput.value;
  renderBacklog();
});
