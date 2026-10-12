function renderChecklistEntries(el, tracker, progress, hasChecklist) {
  const checklistEntriesEl = el.querySelector(".checklist-entries");
  tracker.checklist.forEach((name) => {
    const isCollected = !progress.outstandingChecklist.includes(name);
    const li = document.createElement("li");
    li.className = isCollected ? "checklist-collected" : "checklist-outstanding";
    const span = document.createElement("span");
    span.textContent = (isCollected ? "✓ " : "") + name;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-remove-checklist";
    removeBtn.textContent = "✕";
    removeBtn.setAttribute("aria-label", `Remove ${name} from ${tracker.name}'s checklist`);
    removeBtn.addEventListener("click", () => {
      removeChecklistEntry(tracker.id, name);
    });
    li.appendChild(span);
    li.appendChild(removeBtn);
    checklistEntriesEl.appendChild(li);
  });

  if (!hasChecklist) return;
  const outstandingListEl = el.querySelector(".outstanding-list");
  if (progress.outstandingChecklist.length === 0) {
    outstandingListEl.innerHTML = '<li class="empty-msg">None — fully collected!</li>';
  } else {
    progress.outstandingChecklist.forEach((name) => {
      const li = document.createElement("li");
      li.textContent = name;
      outstandingListEl.appendChild(li);
    });
  }
}
