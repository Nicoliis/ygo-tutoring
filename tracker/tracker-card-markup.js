function buildTrackerCardHtml(tracker, progress, pending, hasChecklist, simulateDisabled) {
  const expanded = expandedTrackers.has(tracker.id);
  return `
    <div class="tracker-header">
      <div class="header-main">
        <input type="text" class="tracker-name-input" value="${escapeHtml(tracker.name)}" aria-label="Tracker name">
        <span class="item-count-badge">${progress.packsOpened} pack(s) opened</span>
        ${hasChecklist ? `<span class="item-count-badge">${progress.checklistCollectedCount} of ${progress.checklistTotal} collected</span>` : ""}
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-secondary btn-delete-tracker">Delete</button>
      </div>
    </div>

    <div class="pull-logger">
      <textarea class="pull-input" rows="3" placeholder="One card name per line&#10;(what you pulled from this pack)" aria-label="Cards pulled from this pack, one per line"></textarea>
      <button type="button" class="btn btn-primary btn-log-pull">Log pull</button>
    </div>

    <div class="simulate-pull">
      <input type="number" min="1" value="${pending ? pending.packCount : 1}" class="simulate-pack-count" aria-label="Number of packs to simulate" ${pending ? "disabled" : ""}>
      <button type="button" class="btn btn-secondary btn-simulate-pull" ${simulateDisabled ? "disabled" : ""}>${isFetchingSetPool ? "Loading…" : "Simulate pull"}</button>
      <span class="simulate-hint">${pending ? `Resolve the pending pull below first` : selectedSetName ? `from ${escapeHtml(selectedSetName)}` : "Pick a set above first"}</span>
    </div>

    ${pending ? `
    <div class="pending-pull-review">
      <h4>Pending pull: ${pending.packCount} pack(s) from ${escapeHtml(pending.setName)}</h4>
      <div class="minicard-list"></div>
      <div class="pending-pull-actions">
        <button type="button" class="btn btn-primary btn-save-pull">Save</button>
        <button type="button" class="btn btn-secondary btn-reattempt-pull">Reattempt</button>
        <button type="button" class="btn btn-secondary btn-discard-pull">Discard</button>
      </div>
    </div>` : ""}

    <div class="checklist-section${expanded ? "" : " collapsed"}">
      <button type="button" class="btn-toggle btn-toggle-checklist" aria-expanded="${expanded}" aria-label="${expanded ? "Hide" : "Show"} checklist for ${escapeHtml(tracker.name)}">${expanded ? "▾ Checklist" : "▸ Checklist"}</button>
      <div class="checklist-body">
        <div class="checklist-add-row">
          <input type="text" class="checklist-name-input" placeholder="Card name" aria-label="Add a card to ${escapeHtml(tracker.name)}'s checklist">
          <button type="button" class="btn btn-secondary btn-add-checklist">Add</button>
        </div>
        <ul class="checklist-entries"></ul>
        ${hasChecklist ? `<div class="outstanding"><h4>Outstanding</h4><ul class="outstanding-list"></ul></div>` : ""}
      </div>
    </div>
  `;
}
