function runCardSearch(query) {
  if (activeSearchController) activeSearchController.abort();
  activeSearchController = new AbortController();

  cardSearchStatus.textContent = "Searching…";
  cardSearchStatus.classList.remove("error");

  const url = `${API_URL}?fname=${encodeURIComponent(query)}`;

  fetch(url, { signal: activeSearchController.signal })
    .then((res) => {
      if (!res.ok) {
        renderSearchResults([]);
        cardSearchStatus.textContent = "No cards found.";
        return null;
      }
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      const results = data.data || [];
      renderSearchResults(results);
      cardSearchStatus.textContent = `${results.length} card(s) found.`;
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      console.error(err);
      renderSearchResults([]);
      cardSearchStatus.textContent = "Search failed. Check your connection and try again.";
      cardSearchStatus.classList.add("error");
    });
}
