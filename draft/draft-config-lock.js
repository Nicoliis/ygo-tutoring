function renderConfigLockState() {
  const locked = session.status !== "configuring";
  boosterInput.disabled = locked;
  amountInput.disabled = locked;
  cardpoolInput.disabled = locked;
  groupingSelect.disabled = locked;
  startDraftBtn.hidden = locked;
  cancelDraftBtn.hidden = !locked;
  if (!locked) draftSection.hidden = true;
}
