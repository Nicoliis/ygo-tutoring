function logPull(trackerId, rawText) {
  const tracker = findTracker(trackerId);
  if (!tracker) return false;
  const lines = (rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    alertDialog("Enter at least one card name (one per line) to log a pull.");
    return false;
  }
  lines.forEach((name) => addOrIncrementCard(name, 1));
  tracker.pulls.push({ id: nextId("pull"), cardNames: lines });
  saveCollection();
  return true;
}
