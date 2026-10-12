/* Booster Draft — card detail modal: a generic accessible dialog engine (mirrors
   tracker.js's showModal/openPulledCardDetailModal) plus the card tag/effect rendering
   this page adds on top of it. Depends on a #modalRoot element existing in the page.
   Loaded as a plain classic script before draft.js, which calls openPickCardDetailModal
   as an ordinary global. No session/draft state lives here — the "Keep This Card" action
   is supplied by the caller via the `onKeep` callback. */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function showModal({ title, bodyHtml, buttons }) {
  const modalRootEl = document.getElementById("modalRoot");
  const previouslyFocused = document.activeElement;

  modalRootEl.hidden = false;
  modalRootEl.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <h2 id="modalTitle">${escapeHtml(title)}</h2>
        <div class="modal-body">${bodyHtml}</div>
        <div class="modal-actions"></div>
      </div>
    </div>
  `;

  const backdrop = modalRootEl.querySelector(".modal-backdrop");
  const dialog = modalRootEl.querySelector(".modal-dialog");
  const actionsEl = modalRootEl.querySelector(".modal-actions");

  function getFocusable() {
    return Array.from(
      dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    );
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key === "Tab") {
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function closeModal() {
    modalRootEl.hidden = true;
    modalRootEl.innerHTML = "";
    document.removeEventListener("keydown", onKeydown, true);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  }

  buttons.forEach((btn) => {
    const buttonEl = document.createElement("button");
    buttonEl.type = "button";
    buttonEl.className = "btn " + (btn.primary ? "btn-primary" : "btn-secondary");
    buttonEl.textContent = btn.label;
    buttonEl.addEventListener("click", (e) => {
      e.stopPropagation();
      closeModal();
      if (btn.onClick) btn.onClick();
    });
    actionsEl.appendChild(buttonEl);
  });

  backdrop.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === backdrop) closeModal();
  });

  document.addEventListener("keydown", onKeydown, true);

  const focusable = getFocusable();
  if (focusable.length > 0) focusable[0].focus();
}

// Only fixed-size, enum-like attributes become tags; prose (effect text) is never a tag.
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

function buildEffectHtml(card) {
  const block = (label, text) =>
    `<div class="card-effect-block"><strong>${escapeHtml(label)}</strong><p>${escapeHtml(text)}</p></div>`;
  if (card.pendDesc || card.monsterDesc) {
    return (
      (card.pendDesc ? block("Pendulum Effect", card.pendDesc) : "") +
      (card.monsterDesc ? block("Monster Effect", card.monsterDesc) : "")
    );
  }
  if (card.desc) return block("Effect", card.desc);
  return "";
}

// `onKeep` is called (with no arguments) when the user confirms "Keep This Card" — the
// caller owns what "keeping" a card means (draft.js ties it to the current pick group).
function openPickCardDetailModal(card, onKeep) {
  const imageHtml = card.imageFull
    ? `<img src="${card.imageFull}" alt="${escapeHtml(card.name)}">`
    : "";
  const tags = buildCardTags(card);
  const tagsHtml = tags.length
    ? `<div class="card-tags">${tags
        .map((t) => `<span class="card-tag"><strong>${escapeHtml(t.label)}:</strong> ${escapeHtml(t.value)}</span>`)
        .join("")}</div>`
    : "";
  const effectHtml = buildEffectHtml(card);
  const bodyHtml =
    imageHtml || tagsHtml || effectHtml
      ? `${imageHtml}${tagsHtml}${effectHtml}`
      : `<div>No further details available for this card.</div>`;

  showModal({
    title: card.name,
    bodyHtml,
    buttons: [
      { label: "Keep This Card", primary: true, onClick: onKeep },
      { label: "Close" },
    ],
  });
}
