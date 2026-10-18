/* Money helpers. Money is ALWAYS integer cents; never floats. */
const CENTS_PER_UNIT = 100; // cents in one unit of money
const CENT_DIGITS = 2; // digits shown after the decimal point
const BOOSTER_BASE_PRICE_CENTS = 100; // what the first purchase of a booster costs
const BOOSTER_PRICE_GROWTH = 1.5; // every further purchase of the same booster costs this many times the last one
const ROUNDING_EPSILON = 1e-9; // makes exact .5 results round up despite float error


/* Price string/number to integer cents; null when missing, invalid or <= 0. */
function toCents(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * CENTS_PER_UNIT);
}

/* 475 -> "4.75" */
function formatMoney(cents) {
  const value = Math.round(Number(cents) || 0);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${Math.floor(abs / CENTS_PER_UNIT)}.${String(abs % CENTS_PER_UNIT).padStart(CENT_DIGITS, "0")}`;
}

/* Price in cents of the k-th purchase of a booster (k = 0 is the first): round_half_up(BOOSTER_BASE_PRICE_CENTS * BOOSTER_PRICE_GROWTH^k). */
function priceForPurchase(k) {
  return Math.round(BOOSTER_BASE_PRICE_CENTS * Math.pow(BOOSTER_PRICE_GROWTH, k) + ROUNDING_EPSILON);
}

/* Total cents for buying n packs when k have already been bought: the successive prices added up. */
function totalForPurchases(k, n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += priceForPurchase(k + i);
  return total;
}
