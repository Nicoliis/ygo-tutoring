function setCardQuantity(cardId, quantityInput) {
  const card = findCard(cardId);
  if (!card) return false;
  const n = parseNonNegativeInt(quantityInput);
  if (n === null) {
    showToast("Quantity must be zero or more.", "warning");
    return false;
  }
  card.quantityOwned = n;
  trimPrintings(card);
  saveCollection();
  return true;
}
