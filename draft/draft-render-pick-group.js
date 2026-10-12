function renderPickGroup() {
  pickGroupAreaEl.innerHTML = "";
  finishedAreaEl.hidden = true;

  if (session.status !== "in-progress" || session.pickQueue.length === 0) {
    pickGroupAreaEl.hidden = true;
    return;
  }
  pickGroupAreaEl.hidden = false;
  const group = session.pickQueue[0];
  group.cards.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick-card";
    btn.draggable = true;
    btn.setAttribute("aria-label", `${card.name} — open to view details and keep`);
    const glow = getRarityGlow(card.rarity);
    if (glow.animated) {
      btn.classList.add("glow-starlight");
    } else {
      btn.style.setProperty("--glow-color", glow.color);
    }
    if (card.imageSmall) {
      const img = document.createElement("img");
      img.src = card.imageSmall;
      img.alt = card.name;
      btn.appendChild(img);
    }
    const nameEl = document.createElement("span");
    nameEl.className = "pick-card-name";
    nameEl.textContent = card.name;
    btn.appendChild(nameEl);
    btn.addEventListener("click", () =>
      openCardDetailModal(card, [
        { label: "Keep This Card", primary: true, onClick: () => handlePick(card) },
        { label: "Close" },
      ])
    );
    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
      btn.classList.add("dragging");
    });
    btn.addEventListener("dragend", () => btn.classList.remove("dragging"));
    pickGroupAreaEl.appendChild(btn);
  });
}
