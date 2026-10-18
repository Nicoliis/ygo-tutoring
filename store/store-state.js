/*
 * Store logic: run balance (integer cents), selling printings, buying boosters, pack inventory.
 * Pure functions; the caller persists. Needs money.js, printings.js and progression-state.js (for the list/run).
 * The run record keeps: balanceCents, boosterBuys { set: n }, packInventory { set: n }, extraPack.
 */
const KEEP_COPIES = 3; // copies of each printing "Sell extras" leaves by default
const KEEP_OPTIONS = [1, 2, 3, 4]; // the choices offered for how many copies to keep

function getBalanceCents(run) {
  return Number.isInteger(run.balanceCents) && run.balanceCents > 0 ? run.balanceCents : 0;
}

function getBoosterBuys(run, setName) {
  const n = run.boosterBuys && run.boosterBuys[setName];
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function getPackCount(run, setName) {
  const n = run.packInventory && run.packInventory[setName];
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/* ---- Selling ---- */

/* printingIndex -1 means a copy with no recorded printing (saved before printings existed): it sells for 0.01. */
function canSell(card, printingIndex) {
  if (printingIndex === -1) {
    const unknown = (Number(card.quantityOwned) || 0) - printingsTotal(card);
    return unknown >= 1
      ? { ok: true, reason: "", valueCents: UNPRICED_SALE_CENTS }
      : { ok: false, reason: "No copy to sell.", valueCents: 0 };
  }
  const printing = Array.isArray(card.printings) ? card.printings[printingIndex] : null;
  if (!printing || !(printing.quantity >= 1)) return { ok: false, reason: "No copy to sell.", valueCents: 0 };
  return { ok: true, reason: "", valueCents: printingSaleValue(printing) };
}

/*
 * Sells one copy of a printing. Changes `collection` IN PLACE (quantities, allocations) and returns the new run
 * record with the credited balance. Check canSell first; throws if the sale is not allowed.
 */
function sellPrinting(run, collection, cardId, printingIndex) {
  const card = collection.cards.find((c) => c.id === cardId);
  if (!card) throw new Error("Card not found.");
  const check = canSell(card, printingIndex);
  if (!check.ok) throw new Error(check.reason);
  if (printingIndex !== -1) {
    const printing = card.printings[printingIndex];
    printing.quantity -= 1;
    if (printing.quantity === 0) card.printings.splice(printingIndex, 1);
  }
  card.quantityOwned = Math.max(0, card.quantityOwned - 1);
  trimPrintings(card);
  clampAllocationsToOwned(collection);
  return { ...run, balanceCents: getBalanceCents(run) + check.valueCents };
}

/* ---- Buying ---- */

function nextPriceCents(run, setName) {
  return priceForPurchase(getBoosterBuys(run, setName));
}

function canBuy(run, setName, amount, boosterList) {
  if (!reachedBoosters(run, boosterList).includes(setName)) {
    return { ok: false, reason: "That booster has not been reached yet.", totalCents: 0, missingCents: 0 };
  }
  if (!Number.isInteger(amount) || amount < 1) {
    return { ok: false, reason: "Choose a whole number of packs, at least 1.", totalCents: 0, missingCents: 0 };
  }
  const totalCents = totalForPurchases(getBoosterBuys(run, setName), amount);
  const balance = getBalanceCents(run);
  if (totalCents > balance) {
    return { ok: false, reason: "Not enough money.", totalCents, missingCents: totalCents - balance };
  }
  return { ok: true, reason: "", totalCents, missingCents: 0 };
}

/* Returns the new run record; throws if the purchase is not allowed (check canBuy first). */
function buyBoosters(run, setName, amount, boosterList) {
  const check = canBuy(run, setName, amount, boosterList);
  if (!check.ok) throw new Error(check.reason);
  return {
    ...run,
    balanceCents: getBalanceCents(run) - check.totalCents,
    boosterBuys: { ...(run.boosterBuys || {}), [setName]: getBoosterBuys(run, setName) + amount },
    packInventory: { ...(run.packInventory || {}), [setName]: getPackCount(run, setName) + amount },
  };
}

/* ---- Extras: every copy over `keep` (default 3). hasExtras counts a card across all sets (for the list filter);
 * selling extras counts each printing on its own. ---- */

function hasExtras(card, keep = KEEP_COPIES) {
  return (Number(card.quantityOwned) || 0) > keep;
}

/* The cheapest copy of a card (lowest sale value; ties: least rare), as { index, valueCents }. index -1 = unknown copy. */
function cheapestCopy(card) {
  const options = [];
  (Array.isArray(card.printings) ? card.printings : []).forEach((printing, index) => {
    if (printing.quantity >= 1) options.push({ index, valueCents: printingSaleValue(printing), rank: rarityRank(printing.rarity) });
  });
  if ((Number(card.quantityOwned) || 0) - printingsTotal(card) >= 1) {
    options.push({ index: -1, valueCents: UNPRICED_SALE_CENTS, rank: 0 });
  }
  options.sort((a, b) => a.valueCents - b.valueCents || a.rank - b.rank);
  return options[0] || null;
}

/* Copies of a card over `keep` in each separate printing (set + rarity), plus the copies with no recorded printing. */
function extraPrintings(card, keep = KEEP_COPIES) {
  const list = (Array.isArray(card.printings) ? card.printings : [])
    .filter((printing) => printing.quantity > keep)
    .map((printing) => ({ printing, extra: printing.quantity - keep }));
  const unknown = (Number(card.quantityOwned) || 0) - printingsTotal(card);
  if (unknown > keep) list.push({ printing: null, extra: unknown - keep });
  return list;
}

/*
 * Sells every copy over `keep` (default 3) within each printing: the same card from another set or rarity counts
 * separately, so each printing keeps its own `keep` copies. Changes `collection` IN PLACE and returns
 * { run, soldCount, totalCents }.
 */
function sellExtras(run, collection, keep = KEEP_COPIES) {
  let current = run;
  let soldCount = 0;
  let totalCents = 0;
  collection.cards.forEach((card) => {
    extraPrintings(card, keep).forEach(({ printing, extra }) => {
      for (let i = 0; i < extra; i++) {
        const index = printing ? card.printings.indexOf(printing) : -1;
        const before = getBalanceCents(current);
        current = sellPrinting(current, collection, card.id, index);
        totalCents += getBalanceCents(current) - before;
        soldCount += 1;
      }
    });
  });
  return { run: current, soldCount, totalCents };
}

/* What sellExtras would do, without changing anything: { soldCount, totalCents, cardCount }. */
function previewExtras(run, collection, keep = KEEP_COPIES) {
  const copy = JSON.parse(JSON.stringify(collection));
  const cardCount = copy.cards.filter((card) => extraPrintings(card, keep).length > 0).length;
  const result = sellExtras(run, copy, keep);
  return { soldCount: result.soldCount, totalCents: result.totalCents, cardCount };
}
