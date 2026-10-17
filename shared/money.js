/* Money helpers. Money is ALWAYS integer cents; never floats. */

/* Price string/number to integer cents; null when missing, invalid or <= 0. */
function toCents(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

/* 475 -> "4.75" */
function formatMoney(cents) {
  const value = Math.round(Number(cents) || 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/* Price in cents of the k-th purchase of a booster (k = 0 is the first): round_half_up(100 * 1.5^k). */
function priceForPurchase(k) {
  return Math.round(100 * Math.pow(1.5, k) + 1e-9);
}

/* Total cents for buying n packs when k have already been bought: the successive prices added up. */
function totalForPurchases(k, n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += priceForPurchase(k + i);
  return total;
}

/*
 * Sale price in cents of a card pulled from a set: the set's own price, else the card's Cardmarket price,
 * else 0.01. Never null, never zero.
 */
function resolveSalePriceCents(setPriceValue, cardmarketValue) {
  return toCents(setPriceValue) || toCents(cardmarketValue) || 1;
}
