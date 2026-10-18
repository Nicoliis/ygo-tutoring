function wireAddDropZone(zoneEl, onCardDrop, onEngineDrop, onMoveDrop) {
  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    zoneEl.classList.add("drop-target-active");
  });
  zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("drop-target-active"));
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneEl.classList.remove("drop-target-active");

    if (onMoveDrop) {
      const moveRaw = e.dataTransfer.getData("application/x-deck-card-move");
      if (moveRaw) {
        try {
          onMoveDrop(JSON.parse(moveRaw));
        } catch (err) {
          // ignore malformed payload
        }
        return;
      }
    }

    if (onEngineDrop) {
      const engineRaw = e.dataTransfer.getData("application/x-engine-source");
      if (engineRaw) {
        try {
          onEngineDrop(JSON.parse(engineRaw));
        } catch (err) {
          // ignore malformed payload
        }
        return;
      }
    }

    const cardId = e.dataTransfer.getData("text/plain");
    if (cardId) onCardDrop(cardId, e);
  });
}
