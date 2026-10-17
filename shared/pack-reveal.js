/*
 * Pack reveal: ONE card back (the pack); each click pulls the next card, which flips and flies to the
 * pulled strip in a single motion. Shared by the Progression Run and the Booster Draft.
 * See specs/010-pack-opening-experience/contracts/pack-reveal-contract.md.
 *
 * - Cards must already be ordered (use sortPackByRarity); they are pulled in that order, rarest last.
 * - The card back exposes NO name, rarity, price or image (text, attributes, accessible names).
 * - With prefers-reduced-motion the card just appears in the strip.
 * - Cards already revealed in `pack.revealed` are assumed to already be in the pulled strip (the caller
 *   repopulates it); the stack only holds the cards still to pull.
 * Needs rarity.js (applyRarityGlow, buildRarityBadge, rarityLabel) loaded; card detail on click needs
 * shared/card-detail-modal.js (optional).
 */
const PACK_FLIGHT_MS = 700;

function prefersReducedMotion() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/*
 * The face-up card tile used in the pulled strip and the "See pulled" view. Clicking it opens the card
 * details. interactive:false builds a plain (non-clickable) copy used while the card is flying.
 */
function buildRevealedCardElement(card, interactive = true) {
  const el = document.createElement(interactive ? "button" : "div");
  el.className = "revealed-card";
  if (interactive) {
    el.type = "button";
    el.setAttribute("aria-label", `${card.name}, ${rarityLabel(card.rarity)} — view details`);
    el.addEventListener("click", () => {
      if (typeof openCardDetailModal === "function") openCardDetailModal(card);
    });
  }
  applyRarityGlow(el, card.rarity);
  if (card.imageSmall) {
    const img = document.createElement("img");
    img.src = card.imageSmall;
    img.alt = interactive ? "" : card.name;
    el.appendChild(img);
  }
  const nameEl = document.createElement("span");
  nameEl.className = "revealed-card-name";
  nameEl.textContent = card.name;
  el.appendChild(nameEl);
  el.appendChild(buildRarityBadge(card.rarity));
  return el;
}

function createPackReveal(containerEl, options) {
  const { pack, pulledStripEl, actionSlotEl, onReveal, onPackComplete, nextAction } = options;
  const total = pack.cards.length;
  const revealed = pack.revealed.slice();
  let remaining = revealed.filter((r) => !r).length;
  let inFlight = 0;
  let completed = false;
  let destroyed = false;

  containerEl.innerHTML = "";
  actionSlotEl.innerHTML = "";

  const liveEl = document.createElement("div");
  liveEl.className = "visually-hidden";
  liveEl.setAttribute("role", "status");
  liveEl.setAttribute("aria-live", "polite");
  containerEl.appendChild(liveEl);

  let stackBtn = null;
  let countEl = null;
  if (remaining > 0) {
    stackBtn = document.createElement("button");
    stackBtn.type = "button";
    stackBtn.className = "pack-stack";
    stackBtn.innerHTML = '<span class="pack-stack-count" aria-hidden="true"></span>';
    countEl = stackBtn.querySelector(".pack-stack-count");
    stackBtn.addEventListener("click", pullNext);
    containerEl.appendChild(stackBtn);
    updateStack();
  }

  function updateStack() {
    if (!stackBtn) return;
    stackBtn.setAttribute("aria-label", `Pull the next card (${remaining} of ${total} left)`);
    countEl.textContent = String(remaining);
  }

  function finishIfDone() {
    if (completed || destroyed || remaining > 0 || inFlight > 0) return;
    completed = true;
    Promise.resolve(onPackComplete ? onPackComplete() : null).then(() => {
      if (destroyed) return;
      const action = nextAction ? nextAction() : null;
      actionSlotEl.innerHTML = "";
      if (!action) return;
      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = "btn btn-primary pack-next-btn";
      actionBtn.textContent = action.label;
      actionBtn.addEventListener("click", action.onClick);
      actionSlotEl.appendChild(actionBtn);
      actionBtn.focus();
    });
  }

  function land(final, flier) {
    if (flier) flier.remove();
    final.style.visibility = "";
    inFlight -= 1;
    finishIfDone();
  }

  /* Flip and fly at the same time: one animation, rotation and movement together. */
  function flyToStrip(card, fromRect) {
    const final = buildRevealedCardElement(card);
    pulledStripEl.prepend(final); // newest pull always goes first
    inFlight += 1;
    if (prefersReducedMotion() || !fromRect || typeof final.animate !== "function") {
      land(final, null);
      return;
    }
    final.style.visibility = "hidden";
    const to = final.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (fromRect.left + fromRect.width / 2);
    const dy = to.top + to.height / 2 - (fromRect.top + fromRect.height / 2);
    const scale = fromRect.width > 0 ? to.width / fromRect.width : 1;

    const flier = document.createElement("div");
    flier.className = "pack-flier";
    flier.style.left = `${fromRect.left}px`;
    flier.style.top = `${fromRect.top}px`;
    flier.style.width = `${fromRect.width}px`;
    flier.style.height = `${fromRect.height}px`;
    const back = document.createElement("div");
    back.className = "pack-flier-back";
    const front = document.createElement("div");
    front.className = "pack-flier-front";
    front.appendChild(buildRevealedCardElement(card, false));
    flier.append(back, front);
    document.body.appendChild(flier);

    const flight = flier.animate(
      [
        { transform: "perspective(900px) translate(0px, 0px) scale(1) rotateY(0deg)" },
        { transform: `perspective(900px) translate(${dx}px, ${dy}px) scale(${scale}) rotateY(180deg)` },
      ],
      { duration: PACK_FLIGHT_MS, easing: "ease-in-out", fill: "forwards" }
    );
    flight.onfinish = () => land(final, flier);
    flight.oncancel = () => land(final, flier);
  }

  function pullNext() {
    if (destroyed || remaining <= 0) return;
    const index = revealed.findIndex((r) => !r);
    if (index === -1) return;
    revealed[index] = true;
    remaining -= 1;
    const card = pack.cards[index];
    const fromRect = stackBtn.getBoundingClientRect();
    liveEl.textContent = `Pulled: ${card.name}, ${rarityLabel(card.rarity)}`;
    if (onReveal) onReveal(index, card, revealed.slice());
    if (remaining === 0) {
      stackBtn.remove();
      stackBtn = null;
    } else {
      updateStack();
    }
    flyToStrip(card, fromRect);
  }

  // A resumed pack whose cards were all revealed before the reload still has to finish.
  if (remaining === 0) finishIfDone();

  return {
    pullNext,
    isComplete: () => completed,
    destroy() {
      destroyed = true;
      containerEl.innerHTML = "";
      actionSlotEl.innerHTML = "";
      document.querySelectorAll(".pack-flier").forEach((el) => el.remove());
    },
  };
}
