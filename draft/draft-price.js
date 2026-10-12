function parsePrice(apiCard) {
  const prices = Array.isArray(apiCard.card_prices) ? apiCard.card_prices[0] : null;
  const raw = prices && prices.tcgplayer_price;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
