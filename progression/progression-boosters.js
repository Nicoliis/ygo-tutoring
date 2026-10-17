/* Release dates and set images are display-only (never affect stage order). One cached cardsets.php call. */
const SET_DATES_KEY = "ygoSetDates";
const SET_DATES_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
let setDates = {};
let setImages = {};

function loadSetDates() {
  const cached = loadData(SET_DATES_KEY);
  if (cached && cached.dates) {
    setDates = cached.dates;
    setImages = cached.images || {};
    // A cache written before images were stored has no `images` key: refetch once to add them.
    if (cached.images && Date.now() - Number(cached.fetchedAt || 0) < SET_DATES_MAX_AGE_MS) return Promise.resolve();
  }
  return fetch(CARD_API_BASE + "cardsets.php")
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((sets) => {
      const dates = {};
      const images = {};
      (Array.isArray(sets) ? sets : []).forEach((s) => {
        if (!s.set_name) return;
        if (s.tcg_date) dates[s.set_name] = s.tcg_date;
        if (s.set_image) images[s.set_name] = s.set_image;
      });
      setDates = dates;
      setImages = images;
      saveData({ fetchedAt: Date.now(), dates, images }, SET_DATES_KEY);
    })
    .catch((err) => console.warn("Could not load release dates:", err));
}

function getReleaseDate(setName) {
  return setDates[setName] || null;
}

/* Not every set has a picture; callers fall back to a placeholder pack. */
function getSetImage(setName) {
  return setImages[setName] || null;
}
