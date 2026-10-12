let searchTimer = null;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  const query = searchInput.value.trim();

  if (query.length < SEARCH_MIN_LEN) {
    lastResults = [];
    renderResults([]);
    searchStatus.textContent =
      query.length === 0 ? "" : `Type at least ${SEARCH_MIN_LEN} characters to search.`;
    searchStatus.classList.remove("error");
    return;
  }

  searchTimer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
});

typeFilter.addEventListener("change", () => {
  renderResults(lastResults);
});
