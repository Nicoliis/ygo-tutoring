function openImportModal(deckId) {
  const textareaId = nextId("ydkText");
  const fileInputId = nextId("ydkFile");

  showModal({
    title: "Import deck (YDK)",
    bodyHtml: `
      <p>Choose a .ydk file, or paste YDK text below.</p>
      <input type="file" id="${fileInputId}" accept=".ydk,text/plain" aria-label="Choose a .ydk file">
      <textarea id="${textareaId}" rows="8" class="ydk-import-textarea" aria-label="YDK text to import" placeholder="#main&#10;...&#10;#extra&#10;..."></textarea>
    `,
    buttons: [
      { label: "Cancel" },
      {
        label: "Import",
        primary: true,
        onClick: () => {
          const textarea = document.getElementById(textareaId);
          importYdkIntoDeck(deckId, textarea ? textarea.value : "");
        },
      },
    ],
  });

  const fileInput = document.getElementById(fileInputId);
  if (!fileInput) return;
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const textarea = document.getElementById(textareaId);
      if (textarea) textarea.value = String(reader.result || "");
    };
    reader.readAsText(file);
  });
}
