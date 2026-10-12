let activeController = null;

async function runSearch(query) {
  if (activeController) activeController.abort();
  activeController = new AbortController();

  searchStatus.textContent = "Searching…";
  searchStatus.classList.remove("error");

  const url = `${API_URL}?fname=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, { signal: activeController.signal });

    if (!res.ok) {
      lastResults = [];
      renderResults([]);
      searchStatus.textContent = "No cards found.";
      return;
    }

    const data = await res.json();
    lastResults = data.data || [];
    renderResults(lastResults);
    searchStatus.textContent = `${lastResults.length} card(s) found.`;
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error(err);
    lastResults = [];
    renderResults([]);
    searchStatus.textContent = "Search failed. Check your connection and try again.";
    searchStatus.classList.add("error");
  }
}
