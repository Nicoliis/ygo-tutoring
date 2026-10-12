function exportDeckAsYdk(deckId) {
  const deck = findDeck(deckId);
  if (!deck) return;
  if (deck.main.length === 0 && deck.extra.length === 0) {
    showToast("This deck has no cards to export.", "warning");
    return;
  }

  const { text, skipped } = buildYdkText(deck);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${deck.name || "deck"}.ydk`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (skipped.length > 0) {
    showToast(
      `Exported, but these cards have no stored database id and were skipped: ${skipped.join(", ")}`,
      "warning"
    );
  } else {
    showToast(`Exported "${deck.name}" and copied it to the clipboard.`, "success");
  }
}
