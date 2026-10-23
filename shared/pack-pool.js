/* Pack-generation pieces shared by the Booster Draft and Progression Run (UI-free). */
const SET_CARDS_URL = CARD_API_BASE + "cardinfo.php";
const setApiCardsCache = new Map(); // setName -> raw cards of the set (shared by the pack pool and the completionist binder)
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

/* Resolves to the raw cards of a set, requested once per set; a failed request is not remembered (it can be retried). */
function fetchSetApiCards(setName) {
  if (setApiCardsCache.has(setName)) return Promise.resolve(setApiCardsCache.get(setName));
  const url = `${SET_CARDS_URL}?cardset=${encodeURIComponent(setName)}`;
  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    })
    .then((data) => {
      const cards = Array.isArray(data.data) ? data.data : [];
      setApiCardsCache.set(setName, cards);
      return cards;
    });
}

/* Resolves to the set's weighted card pool; rejects (no UI side effects) on failure. */
function fetchSetCardPool(setName) {
  if (setCardPoolCache.has(setName)) return Promise.resolve(setCardPoolCache.get(setName));
  return fetchSetApiCards(setName)
    .then((cards) => {
      const pool = cards.map((card) => {
        const sets = Array.isArray(card.card_sets) ? card.card_sets : [];
        const match = sets.find((s) => s.set_name === setName);
        const rarity = match ? match.set_rarity : null;
        return {
          name: card.name,
          rarity,
          set: setName,
          weight: getWeightForRarity(rarity),
          price: parsePrice(card),
          setCode: match && match.set_code ? match.set_code : null,
          ...extractCardFields(card),
        };
      });
      setCardPoolCache.set(setName, pool);
      return pool;
    });
}

/*
 * A card taken straight from the card data instead of a pack (Hand Test): the FIRST set the card is listed in gives
 * its set, rarity, set code and price (the set's own price, else the market price). Same shape as a pulled card, so
 * mergeCardsIntoBacklog stores it with its printing. A card listed in no set simply has no printing.
 */
function cardFromFirstSet(apiCard) {
  const first = Array.isArray(apiCard.card_sets) && apiCard.card_sets.length > 0 ? apiCard.card_sets[0] : null;
  const setPrice = first ? Number(first.set_price) : NaN;
  return {
    name: apiCard.name,
    set: first && first.set_name ? first.set_name : null,
    rarity: first && first.set_rarity ? first.set_rarity : null,
    setCode: first && first.set_code ? first.set_code : null,
    price: Number.isFinite(setPrice) && setPrice > 0 ? setPrice : parsePrice(apiCard),
    ...extractCardFields(apiCard),
  };
}
