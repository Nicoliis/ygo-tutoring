/*
 * One slot of the completionist binder: DOM only, no state and no rules. Read-only: it can be opened, nothing else.
 *
 *   buildCompletionistSlot(slot, { owned, onOpen })
 *
 * Owned (owned > 0): full colour, the rarity glow and "×N". Missing: greyed picture, no glow and the text "Missing".
 * Every slot keeps its rarity tag and shows its set number (set_code). Needs rarity.js (buildRarityBadge, applyRarityGlow, rarityLabel) and
 * card-slot-view.js (buildCardFace).
 */
function buildCompletionistSlot(slot, { owned, onOpen }) {
  const isOwned = owned > 0;
  const wrapper = document.createElement("div");
  wrapper.className = "binder-slot completionist-slot" + (isOwned ? "" : " completionist-missing");

  const open = document.createElement("button");
  open.type = "button";
  open.className = "binder-card";
  open.title = `${slot.name} · ${rarityLabel(slot.rarity)}${slot.setCode ? ` · ${slot.setCode}` : ""}`;
  open.setAttribute("aria-label", `${slot.name}, ${rarityLabel(slot.rarity)}, ${isOwned ? `owned ×${owned}` : "missing"}`);
  if (isOwned) applyRarityGlow(open, slot.rarity);
  open.addEventListener("click", () => onOpen());
  open.appendChild(buildCardFace(slot.card));

  const tag = document.createElement("span");
  tag.className = "completionist-tag";
  tag.appendChild(buildRarityBadge(slot.rarity));
  open.appendChild(tag);

  if (slot.setCode) {
    const code = document.createElement("span");
    code.className = "completionist-code";
    code.textContent = slot.setCode;
    open.appendChild(code);
  }
  wrapper.appendChild(open);

  const count = document.createElement("span");
  count.className = "binder-qty" + (isOwned ? "" : " completionist-missing-text");
  count.textContent = isOwned ? `×${owned}` : "Missing";
  wrapper.appendChild(count);
  return wrapper;
}
