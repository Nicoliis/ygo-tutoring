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

  return el;
}
