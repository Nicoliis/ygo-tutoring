function addChecklistEntry(trackerId, name) {
  const tracker = findTracker(trackerId);
  if (!tracker) return false;
  const trimmed = (name || "").trim();
  if (!trimmed) {
    alertDialog("Enter a card name to add to the checklist.");
    return false;
  }
  const exists = tracker.checklist.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  if (!exists) tracker.checklist.push(trimmed);
  saveCollection();
  return true;
}

function removeChecklistEntry(trackerId, name) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  showModal({
    title: "Remove checklist entry?",
    bodyHtml: `<p>${escapeHtml(`Remove "${name}" from ${tracker.name}'s checklist?`)}</p>`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Remove",
        primary: true,
        onClick: () => {
          tracker.checklist = tracker.checklist.filter((n) => n !== name);
          saveCollection();
          renderTrackers();
        },
      },
    ],
  });
}
