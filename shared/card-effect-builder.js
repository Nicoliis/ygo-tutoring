/* The effect text with one line per sentence (sentences.js), so a long effect reads in small steps. */
function buildEffectHtml(card) {
  const block = (label, text) =>
    `<div class="card-effect-block"><strong>${escapeHtml(label)}</strong><div class="card-effect-text">` +
    splitSentences(text)
      .map((sentence) => `<div class="card-effect-sentence">${escapeHtml(sentence)}</div>`)
      .join("") +
    "</div></div>";
  if (card.pendDesc || card.monsterDesc) {
    return (
      (card.pendDesc ? block("Pendulum Effect", card.pendDesc) : "") +
      (card.monsterDesc ? block("Monster Effect", card.monsterDesc) : "")
    );
  }
  if (card.desc) return block("Effect", card.desc);
  return "";
}
