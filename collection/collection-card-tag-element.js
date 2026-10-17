function buildCardTagElement(card, draggable) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "card-tag";
  el.dataset.cardId = card.id;
  el.setAttribute("aria-label", card.name);

  if (draggable) {
    el.draggable = true;
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", card.id);
      e.dataTransfer.effectAllowed = "copy";
    });
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "card-tag-name " + typeColorClass(card.type);
  nameSpan.textContent = card.name;
  el.appendChild(nameSpan);

  // Glow + explicit rarity name of the rarest known printing (cards without printings get neither).
  const rarest = typeof rarestPrinting === "function" ? rarestPrinting(card) : null;
  if (rarest) {
    applyRarityGlow(el, rarest.rarity);
    el.appendChild(buildRarityBadge(rarest.rarity));
  }

  return el;
}
