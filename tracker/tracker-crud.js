function createTracker(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) {
    alertDialog("Enter a tracker name.");
    return false;
  }
  collection.trackers.push({ id: nextId("tracker"), name: trimmed, checklist: [], pulls: [] });
  saveCollection();
  return true;
}

function updateTracker(trackerId, changes) {
  const tracker = findTracker(trackerId);
  if (!tracker) return false;
  if (changes.name !== undefined) {
    const trimmed = (changes.name || "").trim();
    if (!trimmed) {
      alertDialog("Enter a tracker name.");
      return false;
    }
    tracker.name = trimmed;
  }
  saveCollection();
  return true;
}
