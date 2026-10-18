function wireEngineCardActions(el, engine) {
  wireAddDropZone(el, (cardId, e) => {
    // a card dragged out of this same engine and dropped back on it is not an add
    const from = e.dataTransfer.getData("application/x-engine-card");
    if (from && JSON.parse(from).engineId === engine.id) return;
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
