function updatePreview() {
  const amount = Number(amountInput.value);
  const cardpool = Number(cardpoolInput.value);
  const boosterSize = session.boosterSize || DEFAULT_BOOSTER_SIZE;
  if (session.setName && Number.isFinite(amount) && amount >= 1 && Number.isFinite(cardpool) && cardpool >= 1) {
    const kept = Math.floor(amount) * Math.floor(boosterSize / Math.floor(cardpool));
    const total = Math.floor(amount) * boosterSize;
    keptTotalPreviewEl.textContent = `${kept}/${total}`;
  } else {
    keptTotalPreviewEl.textContent = "0/0";
  }
}
amountInput.addEventListener("input", updatePreview);
cardpoolInput.addEventListener("input", updatePreview);
