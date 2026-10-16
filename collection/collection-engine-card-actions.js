function wireEngineCardActions(el, engine) {
  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/x-engine-source", JSON.stringify({ engineId: engine.id }));
    e.dataTransfer.effectAllowed = "copy";
  });

  wireAddDropZone(el, (cardId) => {
    if (addCardToEngine(engine.id, cardId, 1)) renderAll();
  });

  el.querySelector(".btn-rename-engine").addEventListener("click", (e) => {
    e.stopPropagation();
    openRenameModal(engine.name, (newName) => {
      if (updateEngine(engine.id, { name: newName })) renderAll();
    });
  });

  el.querySelector(".btn-delete-engine").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteEngine(engine.id);
  });
}
