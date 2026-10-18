let draftPackReveal = null;
let draftRevealBooster = null;

function hideBoosterReveal() {
  if (draftPackReveal) draftPackReveal.destroy();
  draftPackReveal = null;
  draftRevealBooster = null;
  draftPulledStripEl.innerHTML = "";
  revealAreaEl.hidden = true;
}

/* Face-down reveal of one booster; the pick groups for it are offered once it finishes. */
function showBoosterReveal(boosterIndex) {
  revealAreaEl.hidden = false;
  if (draftRevealBooster === boosterIndex && draftPackReveal) return;
  hideBoosterReveal();
  revealAreaEl.hidden = false;
  draftRevealBooster = boosterIndex;
  draftPackReveal = createPackReveal(draftPackAreaEl, {
    pack: { cards: session.boosters[boosterIndex], revealed: session.boosters[boosterIndex].map(() => false) },
    pulledStripEl: draftPulledStripEl,
    actionSlotEl: draftPackActionEl,
    onPackComplete: () => {
      session.revealed[boosterIndex] = true;
    },
    nextAction: () => ({ label: "Start picking", onClick: renderAll }),
  });
}

function renderPickGroup() {
  pickGroupAreaEl.innerHTML = "";
  finishedAreaEl.hidden = true;

  if (session.status !== "in-progress" || session.pickQueue.length === 0) {
    pickGroupAreaEl.hidden = true;
    hideBoosterReveal();
    return;
  }
  const group = session.pickQueue[0];
  if (!session.revealed[group.boosterIndex]) {
    pickGroupAreaEl.hidden = true;
    showBoosterReveal(group.boosterIndex);
    return;
  }
  hideBoosterReveal();
  pickGroupAreaEl.hidden = false;
  group.cards.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick-card";
    btn.draggable = true;
    btn.setAttribute("aria-label", `${card.name}, ${rarityLabel(card.rarity)} — open to view details and keep`);
    applyRarityGlow(btn, card.rarity);
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
    btn.appendChild(buildRarityBadge(card.rarity));
    btn.addEventListener("click", () =>
      openCardDetailModal(
        card,
        [
          { label: "Keep This Card", primary: true, onClick: () => handlePick(card) },
          { label: "Close" },
        ],
        "",
        draftContextFor(card)
      )
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
