function fetchAllSets() {
  if (allSetsCache) return Promise.resolve(allSetsCache);
  isFetchingSets = true;
  renderSetPicker();
  return fetch(SETS_URL)
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((data) => {
      const list = Array.isArray(data) ? data : [];
      const mapped = list
        .filter((entry) => entry && entry.set_name)
        .map((entry) => ({ name: entry.set_name, releaseDate: entry.tcg_date || null }));
      mapped.sort((a, b) => {
        if (!a.releaseDate && !b.releaseDate) return 0;
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });
      allSetsCache = mapped;
      isFetchingSets = false;
      renderSetPicker();
      return allSetsCache;
    })
    .catch((err) => {
      console.warn("Could not load card sets:", err);
      isFetchingSets = false;
      renderSetPicker();
      alertDialog("Couldn't load the set list — check your connection and try again.");
      throw err;
    });
}
