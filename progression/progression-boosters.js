/* Release dates are display-only (never affect stage order). One cached cardsets.php call. */
const SET_DATES_KEY = "ygoSetDates";
const SET_DATES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
let setDates = {};

function loadSetDates() {
  const cached = loadData(SET_DATES_KEY);
  if (cached && cached.dates) {
    setDates = cached.dates;
    if (Date.now() - Number(cached.fetchedAt || 0) < SET_DATES_MAX_AGE_MS) return Promise.resolve();
  }
  return fetch(CARD_API_BASE + "cardsets.php")
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((sets) => {
      const dates = {};
      (Array.isArray(sets) ? sets : []).forEach((s) => {
        if (s.set_name && s.tcg_date) dates[s.set_name] = s.tcg_date;
      });
      setDates = dates;
      saveData({ fetchedAt: Date.now(), dates }, SET_DATES_KEY);
    })
    .catch((err) => console.warn("Could not load release dates:", err));
}

function getReleaseDate(setName) {
  return setDates[setName] || null;
}
