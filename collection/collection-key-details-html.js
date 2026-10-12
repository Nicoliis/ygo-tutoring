function buildKeyDetailsHtml(card) {
  const nameLine = `<div class="card-tag-hover-name">${escapeHtml(card.name)}</div>`;
  if (!card.type) return nameLine;
  const isMonster = card.type.includes("Monster");
  let detail;
  if (isMonster) {
    const parts = [card.type];
    if (card.level != null) parts.push(`Level ${card.level}`);
    if (card.atk != null || card.def != null) {
      parts.push(`ATK ${card.atk != null ? card.atk : "?"} / DEF ${card.def != null ? card.def : "?"}`);
    }
    detail = parts.join(" · ");
  } else {
    detail = card.type;
  }
  return nameLine + `<div class="card-tag-hover-detail">${escapeHtml(detail)}</div>`;
}
