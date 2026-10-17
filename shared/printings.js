/*
 * Printings: which set/rarity/price each owned copy came from. Stored in card.printings
 * (optional; cards saved before this feature have none). Pure helpers, no storage.
 *   printing = { set: non-empty string, rarity: string | null, price: number >= 0, quantity: integer >= 1 }
 * Identity is the (set, rarity) pair within a card. The price is recorded at the FIRST pull of a printing.
 */
function printingsTotal(card) {
  const list = Array.isArray(card.printings) ? card.printings : [];
  return list.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
}

function addPrinting(card, { set, rarity, price }) {
  if (!set) return;
  if (!Array.isArray(card.printings)) card.printings = [];
  const normalizedRarity = rarity || null;
  const existing = card.printings.find((p) => p.set === set && (p.rarity || null) === normalizedRarity);
  if (existing) {
    existing.quantity += 1;
    return;
  }
  card.printings.push({
    set,
    rarity: normalizedRarity,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: 1,
  });
}

function printingSummary(card) {
  const list = Array.isArray(card.printings) ? card.printings : [];
  const unknownQuantity = Math.max(0, (Number(card.quantityOwned) || 0) - printingsTotal(card));
  return { printings: list.map((p) => ({ ...p })), unknownQuantity };
}

/* Keeps quantityOwned >= sum(printings.quantity) by trimming the oldest printings first. */
function trimPrintings(card) {
  if (!Array.isArray(card.printings)) return;
  let excess = printingsTotal(card) - (Number(card.quantityOwned) || 0);
  while (excess > 0 && card.printings.length > 0) {
    const oldest = card.printings[0];
    if (oldest.quantity > excess) {
      oldest.quantity -= excess;
      excess = 0;
    } else {
      excess -= oldest.quantity;
      card.printings.shift();
    }
  }
}

/* Rarest known printing of a card, or null (used for the collection glow/badge). */
function rarestPrinting(card) {
  const list = Array.isArray(card.printings) ? card.printings.filter((p) => p.rarity) : [];
  if (list.length === 0) return null;
  return list.reduce((best, p) => (rarityRank(p.rarity) > rarityRank(best.rarity) ? p : best));
}

/* HTML for the detail modals; empty string when there is nothing to show. Needs rarity.js + dom-utils.js. */
function buildPrintingsHtml(card) {
  const { printings, unknownQuantity } = printingSummary(card);
  if (printings.length === 0 && unknownQuantity === 0) return "";
  const rows = printings.map((p) => {
    const price = p.price > 0 ? ` · $${p.price.toFixed(2)}` : "";
    return `<li><strong>${escapeHtml(rarityLabel(p.rarity))}</strong>${price} × ${p.quantity}</li>`;
  });
  if (unknownQuantity > 0) rows.push(`<li>Unknown rarity × ${unknownQuantity}</li>`);
  return `<div class="card-printings"><strong>Printings:</strong><ul>${rows.join("")}</ul></div>`;
}
