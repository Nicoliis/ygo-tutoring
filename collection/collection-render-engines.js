function buildEngineCardElement(engine) {
  const expanded = expandedEngines.has(engine.id);
  const totalCopies = engine.cards.reduce((sum, ec) => sum + ec.quantity, 0);

  const el = document.createElement("div");
  el.className = "engine-card bag" + (expanded ? " expanded" : " collapsed");
  el.innerHTML = buildEngineCardHtml(engine, expanded, totalCopies);
  el.setAttribute(
    "aria-label",
    `${engine.name} engine, ${expanded ? "expanded" : "collapsed"}, ${engine.cards.length} card type(s)`
  );

  wireEngineCardHeader(el, engine, expanded);
  wireEngineCardActions(el, engine);
  if (expanded) renderEngineCardContents(el, engine);

  return el;
}

function renderEngines() {
  engineListEl.innerHTML = "";

  if (collection.engines.length === 0) {
    engineListEl.innerHTML = '<p class="empty-msg">No engines yet. Create one above.</p>';
    return;
  }

  collection.engines.forEach((engine) => {
    engineListEl.appendChild(buildEngineCardElement(engine));
  });
}
