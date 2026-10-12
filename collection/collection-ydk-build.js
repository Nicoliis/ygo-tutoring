function buildYdkText(deck) {
  const skipped = [];
  function flatten(list) {
    const lines = [];
    list.forEach((entry) => {
      const card = findCard(entry.cardId);
      if (!card || card.apiId == null) {
        if (card && !skipped.includes(card.name)) skipped.push(card.name);
        return;
      }
      for (let i = 0; i < entry.quantity; i++) lines.push(String(card.apiId));
    });
    return lines;
  }
  const mainLines = flatten(deck.main);
  const extraLines = flatten(deck.extra);
  const text = [
    "#created by YGO Proxy Sheet Builder",
    "#main",
    ...mainLines,
    "#extra",
    ...extraLines,
    "!side",
  ].join("\n");
  return { text, skipped };
}
