function wireEngineCardHeader(el, engine, expanded) {
  const headerEl = el.querySelector(".bag-header");
  headerEl.addEventListener("click", (e) => {
    if (e.target.closest(".header-actions")) return;
    if (expandedEngines.has(engine.id)) expandedEngines.delete(engine.id);
    else expandedEngines.add(engine.id);
    renderEngines();
  });
  headerEl.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".header-actions")) {
      e.preventDefault();
      headerEl.click();
    }
  });
  // Dragging the name bar takes the whole engine (every card of it); dragging a card inside takes only that card.
  headerEl.draggable = true;
  headerEl.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/x-engine-source", JSON.stringify({ engineId: engine.id }));
    e.dataTransfer.effectAllowed = "copy";
  });
  headerEl.tabIndex = 0;
  headerEl.setAttribute("role", "button");
  headerEl.setAttribute("aria-expanded", String(expanded));
}
