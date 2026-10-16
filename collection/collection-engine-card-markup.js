function buildEngineCardHtml(engine, expanded, totalCopies) {
  return `
    <div class="bag-header">
      <span class="bag-toggle-icon" aria-hidden="true">${expanded ? "▾" : "▸"}</span>
      <h3 class="bag-name">${escapeHtml(engine.name)}</h3>
      ${expanded ? `<span class="item-count-badge">${engine.cards.length} card type(s), ${totalCopies} total</span>` : ""}
      <div class="header-actions">
        <button type="button" class="btn btn-secondary btn-rename-engine">Rename</button>
        <button type="button" class="btn btn-secondary btn-delete-engine">Delete</button>
      </div>
    </div>
    ${
      expanded
        ? `<div class="bag-body">
             <div class="engine-card-contents card-tag-list"></div>
           </div>`
        : ""
    }
  `;
}
