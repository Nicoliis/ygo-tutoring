/* Pack-generation pieces shared by the Booster Draft and Progression Run (UI-free). */
const SET_CARDS_URL = CARD_API_BASE + "cardinfo.php";
const setCardPoolCache = new Map();

const DEFAULT_BOOSTER_SIZE = 9;
const BOOSTER_SIZE_OVERRIDES = {}; // setName -> cards-per-booster, for known exceptions

function getBoosterSize(setName) {
  return Object.prototype.hasOwnProperty.call(BOOSTER_SIZE_OVERRIDES, setName)
    ? BOOSTER_SIZE_OVERRIDES[setName]
    : DEFAULT_BOOSTER_SIZE;
}

function parsePrice(apiCard) {
  const prices = Array.isArray(apiCard.card_prices) ? apiCard.card_prices[0] : null;
  const raw = prices && prices.tcgplayer_price;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function weightedRandomPick(pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return pool[pool.length - 1];
}

/* Resolves to the set's weighted card pool; rejects (no UI side effects) on failure. */
function fetchSetCardPool(setName) {
  if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
  const url = `${SET_CARDS_URL}?cardset=${encodeURIComponent(setName)}`;
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((data) => {
      const cards = Array.isArray(data.data) ? data.data : [];
      const pool = cards.map((card) => {
        const sets = Array.isArray(card.card_sets) ? card.card_sets : [];
        const match = sets.find((s) => s.set_name === setName);
        const rarity = match ? match.set_rarity : null;
        return {
          name: card.name,
          rarity,
          weight: getWeightForRarity(rarity),
          price: parsePrice(card),
          ...extractCardFields(card),
        };
      });
      setCardPoolCache.set(setName, pool);
      return pool;
    });
}
