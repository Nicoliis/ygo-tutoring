function deleteEngine(engineId) {
  const engine = findEngine(engineId);
  if (!engine) return;

  showModal({
    title: "Delete engine?",
    bodyHtml: `<p>${escapeHtml(`Delete engine "${engine.name}"?`)}</p><p>${escapeHtml("Cards already added to decks stay in those decks.")}</p>`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Delete",
        primary: true,
        onClick: () => {
          collection.engines = collection.engines.filter((e) => e.id !== engineId);
          expandedEngines.delete(engineId);
          saveCollection();
          renderAll();
          showToast(`Deleted engine "${engine.name}".`, "success");
        },
      },
    ],
  });
}
