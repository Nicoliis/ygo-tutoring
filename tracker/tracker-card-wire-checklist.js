function wireTrackerCardChecklist(el, tracker, progress, hasChecklist) {
  el.querySelector(".btn-toggle-checklist").addEventListener("click", () => {
    if (expandedTrackers.has(tracker.id)) expandedTrackers.delete(tracker.id);
    else expandedTrackers.add(tracker.id);
    renderTrackers();
  });

  const checklistNameInput = el.querySelector(".checklist-name-input");
  const addChecklistHandler = () => {
    if (addChecklistEntry(tracker.id, checklistNameInput.value)) {
      renderTrackers();
    }
  };
  el.querySelector(".btn-add-checklist").addEventListener("click", addChecklistHandler);
  checklistNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addChecklistHandler();
    }
  });

  renderChecklistEntries(el, tracker, progress, hasChecklist);
}
