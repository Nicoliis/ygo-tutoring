function showConfigStatus(message, isError) {
  configStatusEl.textContent = message || "";
  configStatusEl.classList.toggle("error", Boolean(isError));
}

function validateConfig() {
  if (!session.setName) return "Select a booster first.";
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
    return "Amount must be a whole number of at least 1.";
  }
  const cardpool = Number(cardpoolInput.value);
  if (!Number.isFinite(cardpool) || !Number.isInteger(cardpool) || cardpool < 1) {
    return "Cardpool must be a whole number of at least 1.";
  }
  if (cardpool > session.boosterSize) {
    return `Cardpool must not exceed this booster's card count (${session.boosterSize}).`;
  }
  return null;
}
