function buildBacklogRow(card) {
  const row = document.createElement("div");
  row.className = "backlog-row";

  row.appendChild(renderCardTag(card, { draggable: true }));
  row.appendChild(buildBacklogQtyStepper(card));

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "btn btn-secondary btn-remove-card";
  removeBtn.textContent = "X";
  removeBtn.setAttribute("aria-label", `Remove ${card.name} from backlog`);
  removeBtn.addEventListener("click", () => removeCard(card.id));
  row.appendChild(removeBtn);

  return row;
}

function renderBacklog() {
  backlogListEl.innerHTML = "";

  if (collection.cards.length === 0) {
    backlogListEl.innerHTML = '<p class="empty-msg">No cards logged yet. Add one above.</p>';
    return;
  }

  const filterLower = backlogFilter.trim().toLowerCase();
  const filtered = collection.cards.filter(
    (c) => !filterLower || c.name.toLowerCase().includes(filterLower)
  );

  if (filtered.length === 0) {
    backlogListEl.innerHTML = '<p class="empty-msg">No cards match your search.</p>';
    return;
  }

  filtered.forEach((card) => backlogListEl.appendChild(buildBacklogRow(card)));
}
