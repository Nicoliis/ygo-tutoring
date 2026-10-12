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

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeModal();
      return;
    }
    if (e.key === "Tab") trapTabKey(e, dialog);
  }

  function closeModal() {
    modalRootEl.hidden = true;
    modalRootEl.innerHTML = "";
    document.removeEventListener("keydown", onKeydown, true);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus();
    }
  }

  wireModalButtons(actionsEl, buttons, closeModal);

  backdrop.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target === backdrop) closeModal();
  });

  document.addEventListener("keydown", onKeydown, true);

  const focusable = getFocusableElements(dialog);
  if (focusable.length > 0) focusable[0].focus();
}
