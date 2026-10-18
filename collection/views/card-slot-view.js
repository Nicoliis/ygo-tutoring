/*
 * Card picture and Backlog binder slot: DOM only, no state and no rules. Actions come in through `options`.
 *
 *   buildCardFace(card)                       the card picture, or a stand-in carrying its name
 *   buildCardSlot(card, options)              one binder slot (with the glow of its rarest printing)
 *   buildEmptySlot()                          an unused slot
 *   options = { onOpen(), stepper (element|null), onRemove (function|null) }
 */
function buildCardFace(card) {
  const standIn = () => {
    const el = document.createElement("span");
    el.className = "card-standin";
    el.textContent = card.name;
    return el;
  };
  const face = document.createElement("span");
  face.className = "card-face";
  if (!card.imageSmall) {
    face.appendChild(standIn());
    return face;
  }
  const img = document.createElement("img");
  img.src = card.imageSmall;
  img.alt = "";
  img.loading = "lazy";
  img.draggable = false;
  img.addEventListener("error", () => {
    face.innerHTML = "";
    face.appendChild(standIn());
  });
  face.appendChild(img);
  return face;
}

function buildCardSlot(card, options) {
  const slot = document.createElement("div");
  slot.className = "binder-slot";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "binder-card";
  open.setAttribute("aria-label", `${card.name} — view details`);
  open.title = card.name;
  open.draggable = true;
  // the glow of the rarest printing of the card, pointing inwards (rarity.css), as the old Backlog tags had
  const rarest = typeof rarestPrinting === "function" ? rarestPrinting(card) : null;
  if (rarest) applyRarityGlow(open, rarest.rarity);
  open.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", card.id);
    e.dataTransfer.effectAllowed = "copy";
  });
  open.addEventListener("click", () => options.onOpen());
  open.appendChild(buildCardFace(card));
  slot.appendChild(open);

  if (options.stepper) {
    slot.appendChild(options.stepper);
  } else {
    const qty = document.createElement("span");
    qty.className = "binder-qty";
    qty.textContent = `×${card.quantityOwned}`;
    qty.setAttribute("aria-label", `Owned quantity for ${card.name}: ${card.quantityOwned}`);
    slot.appendChild(qty);
  }

  if (options.onRemove) {
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove-item binder-remove";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${card.name} from backlog`);
    removeBtn.addEventListener("click", () => options.onRemove());
    slot.appendChild(removeBtn);
  }
  return slot;
}

function buildEmptySlot() {
  const slot = document.createElement("div");
  slot.className = "binder-slot binder-slot-empty";
  slot.setAttribute("aria-hidden", "true");
  return slot;
}
