function buildCardTags(card) {
  const isMonster = typeof card.type === "string" && card.type.includes("Monster");
  const tags = [];
  const typeLabel = card.humanReadableCardType || card.type;
  if (typeLabel) tags.push({ label: "Type", value: typeLabel });
  if (isMonster && card.attribute) tags.push({ label: "Attribute", value: card.attribute });
  if (isMonster && card.race) tags.push({ label: "Race", value: card.race });
  if (!isMonster && card.race) tags.push({ label: "Property", value: card.race });
  if (card.level != null) {
    tags.push({ label: card.frameType === "xyz" ? "Rank" : "Level", value: String(card.level) });
  }
  if (card.scale != null) tags.push({ label: "Pendulum Scale", value: String(card.scale) });
  if (card.linkval != null) tags.push({ label: "Link Rating", value: String(card.linkval) });
  if (Array.isArray(card.linkmarkers) && card.linkmarkers.length > 0) {
    tags.push({ label: "Link Markers", value: card.linkmarkers.join(", ") });
  }
  if (card.atk != null) tags.push({ label: "ATK", value: String(card.atk) });
  if (card.def != null) tags.push({ label: "DEF", value: String(card.def) });
  if (card.archetype) tags.push({ label: "Archetype", value: card.archetype });
  return tags;
}

function buildCardTagsHtml(card) {
  const tags = buildCardTags(card);
  if (!tags.length) return "";
  const chips = tags
    .map((t) => `<span class="card-tag"><strong>${escapeHtml(t.label)}:</strong> ${escapeHtml(t.value)}</span>`)
    .join("");
  return `<div class="card-tags">${chips}</div>`;
}
