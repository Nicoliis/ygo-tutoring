function renderMinicard(card) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "minicard";
  el.setAttribute("aria-label", card.name);
  if (card.imageSmall) {
    const img = document.createElement("img");
    img.src = card.imageSmall;
    img.alt = card.name;
    el.appendChild(img);
  } else {
    const span = document.createElement("span");
    span.className = "minicard-noimg";
    span.textContent = card.name;
    el.appendChild(span);
  }
  el.addEventListener("click", () => openCardDetailModal(card));
  return el;
}
