function openRenameModal(currentName, onSave) {
  const inputId = nextId("renameInput");
  showModal({
    title: "Rename",
    bodyHtml: `<input type="text" id="${inputId}" class="rename-input" value="${escapeHtml(currentName)}" aria-label="New name">`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Save",
        primary: true,
        onClick: () => {
          const input = document.getElementById(inputId);
          onSave(input ? input.value : currentName);
        },
      },
    ],
  });
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave(input.value);
      const modalRootEl = document.getElementById("modalRoot");
      modalRootEl.hidden = true;
      modalRootEl.innerHTML = "";
    }
  });
}
