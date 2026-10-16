function buildDeckCardHtml(deck, expanded, mainTotal, extraTotal) {
  return `
    <div class="bag-header">
      <span class="bag-toggle-icon" aria-hidden="true">${expanded ? "▾" : "▸"}</span>
      <input type="text" class="deck-name-input" value="${escapeHtml(deck.name)}" aria-label="Deck name">
      ${expanded ? `<span class="item-count-badge">${mainTotal + extraTotal} card(s)</span>` : ""}
      <div class="header-actions">
        <button type="button" class="btn btn-secondary btn-export">Export</button>
        <button type="button" class="btn btn-secondary btn-import">Import</button>
        <button type="button" class="btn btn-secondary btn-delete-deck">Delete</button>
      </div>
    </div>
    ${
      expanded
        ? `<div class="bag-body">
             <div class="deck-section">
               <h4>Main Deck <span class="item-count-badge">${mainTotal} total</span></h4>
               <div class="deck-main-list card-tag-list"></div>
             </div>
             <div class="deck-section">
               <h4>Extra Deck <span class="item-count-badge">${extraTotal} total</span></h4>
               <div class="deck-extra-list card-tag-list"></div>
             </div>
           </div>`
        : ""
    }
  `;
}
