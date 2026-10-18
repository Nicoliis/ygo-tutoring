/*
 * Printings: which set/rarity/price each owned copy came from. Stored in card.printings
 * (optional; cards saved before this feature have none). Pure helpers, no storage.
 *   printing = { set: non-empty string, rarity: string | null, price: number >= 0 (dollars), quantity: integer >= 1,
 *                setCode?: string (e.g. "LOB-EN001") }
 * Identity is the (set, rarity) pair within a card. price is recorded at the first pull of a printing and is what a
 * copy of it sells for (printingSaleValue, which needs money.js); the set code is filled in by a later pull if the
 * printing had none yet, and never changed after.
 */

function printingsTotal(card) {
  const list = Array.isArray(card.printings) ? card.printings : [];
  return list.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
}

// What a copy sells for when nothing better is known (old printings, unknown copies): 0.01.
const UNPRICED_SALE_CENTS = 1;

function addPrinting(card, { set, rarity, price, setCode }) {
  if (!set) return;
  if (!Array.isArray(card.printings)) card.printings = [];
  const normalizedRarity = rarity || null;
  const existing = card.printings.find((p) => p.set === set && (p.rarity || null) === normalizedRarity);
  if (existing) {
    existing.quantity += 1;
    if (!existing.setCode && setCode) existing.setCode = setCode;
    return;
  }
  card.printings.push({
    set,
    rarity: normalizedRarity,
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: 1,
    ...(setCode ? { setCode } : {}),
  });
}

/* Sale value of a printing in integer cents: the price recorded for it (the one its details show), or 0.01 when none. */
function printingSaleValue(printing) {
  return (printing && toCents(printing.price)) || UNPRICED_SALE_CENTS;
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

/* Copies owned per rarity (sets merged), rarest first, plus copies of unknown rarity. */
function rarityCounts(card) {
  const byRarity = new Map();
  (Array.isArray(card.printings) ? card.printings : []).forEach((p) => {
    const key = (p.rarity || "").trim();
    byRarity.set(key, (byRarity.get(key) || 0) + (Number(p.quantity) || 0));
  });
  const rows = Array.from(byRarity, ([rarity, quantity]) => ({ rarity: rarity || null, quantity }));
  const unknownQuantity = printingSummary(card).unknownQuantity;
  if (unknownQuantity > 0) {
    const existing = rows.find((r) => r.rarity === null);
    if (existing) existing.quantity += unknownQuantity;
    else rows.push({ rarity: null, quantity: unknownQuantity });
  }
  return rows.sort((a, b) => rarityRank(b.rarity) - rarityRank(a.rarity));
}

/* "How many of each rarity" list shown when a backlog tag is opened; empty when nothing is known. */
function buildRarityCountsHtml(card) {
  const rows = rarityCounts(card);
  if (rows.length === 0) return "";
  const items = rows
    .map((r) => `<li>${buildRarityBadge(r.rarity).outerHTML}<strong>x${r.quantity}</strong></li>`)
    .join("");
  return `<ul class="card-rarity-counts" aria-label="Copies owned per rarity">${items}</ul>`;
}

/* Small subsection for the card details window: copies owned per rarity (sets merged). */
function buildRarityCountsSectionHtml(card) {
  const list = buildRarityCountsHtml(card);
  return list ? `<hr class="card-divider"><div class="card-subsection"><strong>Copies owned</strong>${list}</div>` : "";
}

/* HTML for the detail modals; empty string when there is nothing to show. Needs rarity.js, dom-utils.js and money.js. */
function buildPrintingsHtml(card, { showSet = false } = {}) {
  const { printings, unknownQuantity } = printingSummary(card);
  if (printings.length === 0 && unknownQuantity === 0) return "";
  const rows = printings.map((p) => {
    const price = ` · $${formatMoney(printingSaleValue(p))}`; // the same value the Store pays for a copy
    const where = showSet ? ` — ${escapeHtml(p.set)}${p.setCode ? ` · ${escapeHtml(p.setCode)}` : ""}` : "";
    return `<li><strong>${escapeHtml(rarityLabel(p.rarity))}</strong>${where}${price} × ${p.quantity}</li>`;
  });
  if (unknownQuantity > 0) rows.push(`<li>Unknown rarity × ${unknownQuantity}</li>`);
  return `<div class="card-printings"><strong>Printings:</strong><ul>${rows.join("")}</ul></div>`;
}
