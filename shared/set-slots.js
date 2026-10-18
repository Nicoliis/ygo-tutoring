/*
 * Completionist binder rules: pure functions, no DOM.
 *
 *   slot = { key, apiId, name, setName, setCode, rarity, card }   one printing of a card in a set
 *
 * A card makes one slot per rarity it has in the set; the regional set numbers of one printing (LOB-001, LOB-E001,
 * LOB-EN001) are the same slot. Ownership comes from the printings recorded when cards were pulled (printings.js). Needs card-api.js (extractCardFields) and rarity.js
 * (rarityRank) loaded first.
 */
const UNMATCHED_NOTE_MIN = 1; // fewest unmatched copies that makes the binder show its note
const PERCENT_DIGITS = 0; // decimals of the progress percentage
const PERCENT_SCALE = 100; // percentage is shown out of 100
const PREFERRED_REGION_CODE = /-EN\d/i; // the English set number represents a printing sold under several regional numbers

/* The card number at the end of a set number: "LOB-EN005" -> 5 (no number sorts last). */
function setNumberOf(code) {
  const match = /(\d+)$/.exec(String(code || ""));
  return match ? Number(match[1]) : Infinity;
}

function rarityKey(rarity) {
  return String(rarity || "").trim().toLowerCase();
}

/* One slot per card and rarity in `setName`, in set-code order (then common to rare, then name). */
function buildSetSlots(apiCards, setName) {
  const byPrinting = new Map();
  apiCards.forEach((apiCard) => {
    const entries = Array.isArray(apiCard.card_sets) ? apiCard.card_sets : [];
    entries
      .filter((entry) => entry.set_name === setName)
      .forEach((entry) => {
        const key = `${apiCard.id}|${rarityKey(entry.set_rarity)}`;
        const known = byPrinting.get(key);
        // regional numbers of one printing share a slot; the English number is shown when there is one
        if (known && (PREFERRED_REGION_CODE.test(known.setCode || "") || !PREFERRED_REGION_CODE.test(entry.set_code || ""))) return;
        const fields = extractCardFields(apiCard);
        byPrinting.set(key, {
          key,
          apiId: apiCard.id,
          name: apiCard.name,
          setName,
          setCode: entry.set_code || null,
          rarity: entry.set_rarity || null,
          card: { ...fields, name: apiCard.name, effect: fields.desc },
        });
      });
  });
  return [...byPrinting.values()].sort(
    (a, b) =>
      (setNumberOf(a.setCode) === setNumberOf(b.setCode) ? 0 : setNumberOf(a.setCode) < setNumberOf(b.setCode) ? -1 : 1) ||
      String(a.setCode || "").localeCompare(String(b.setCode || "")) ||
      rarityRank(a.rarity) - rarityRank(b.rarity) ||
      a.name.localeCompare(b.name)
  );
}

function sameCard(slot, card) {
  if (slot.apiId !== undefined && card.apiId !== undefined && card.apiId !== null) return slot.apiId === card.apiId;
  return String(card.name || "").trim().toLowerCase() === slot.name.trim().toLowerCase();
}

/* Copies the user owns of a slot: recorded printings of the same card, set and rarity (any regional set number). */
function ownedFor(slot, collectionCards) {
  let owned = 0;
  collectionCards.forEach((card) => {
    if (!sameCard(slot, card)) return;
    (Array.isArray(card.printings) ? card.printings : []).forEach((printing) => {
      if (printing.set !== slot.setName) return;
      if (rarityKey(printing.rarity) !== rarityKey(slot.rarity)) return;
      owned += printing.quantity;
    });
  });
  return owned;
}

/* { owned, total, percent, complete } for the slots of one set. */
function completion(slots, collectionCards) {
  const owned = slots.filter((slot) => ownedFor(slot, collectionCards) > 0).length;
  const total = slots.length;
  const factor = Math.pow(10, PERCENT_DIGITS);
  const percent = total === 0 ? 0 : Math.round((PERCENT_SCALE * owned * factor) / total) / factor;
  return { owned, total, percent, complete: total > 0 && owned === total };
}

/* Owned copies that cannot colour any slot: no recorded printing, or a printing without a set or a rarity. */
function unmatchedCopies(collectionCards) {
  let count = 0;
  collectionCards.forEach((card) => {
    const printings = Array.isArray(card.printings) ? card.printings : [];
    const recorded = printings.reduce((sum, p) => sum + p.quantity, 0);
    count += Math.max(0, (Number(card.quantityOwned) || 0) - recorded);
    printings.forEach((p) => {
      if (!p.set || !rarityKey(p.rarity)) count += p.quantity;
    });
  });
  return count;
}
