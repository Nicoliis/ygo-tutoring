function resetSession() {
  session = freshSession();
  boosterInput.value = "";
  amountInput.value = "1";
  cardpoolInput.value = "3";
  groupingSelect.value = "rarity";
  updatePreview();
  showConfigStatus("");
  hideBoosterReveal();
  draftSection.hidden = true;
  renderConfigLockState();
}

cancelDraftBtn.addEventListener("click", async () => {
  const ok = await confirmDialog("Abandon this draft? Any cards already picked will be discarded.", { title: "Abandon draft", confirmLabel: "Abandon" });
  if (!ok) return;
  resetSession();
});
