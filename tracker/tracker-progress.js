function computeTrackerProgress(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) {
    return { packsOpened: 0, checklistTotal: 0, checklistCollectedCount: 0, outstandingChecklist: [] };
  }
  const collectedNames = new Set();
  tracker.pulls.forEach((pull) => {
    pull.cardNames.forEach((name) => collectedNames.add(name.toLowerCase()));
  });
  const checklistTotal = tracker.checklist.length;
  const checklistCollectedCount = tracker.checklist.filter((name) =>
    collectedNames.has(name.toLowerCase())
  ).length;
  const outstandingChecklist = tracker.checklist.filter(
    (name) => !collectedNames.has(name.toLowerCase())
  );
  return {
    packsOpened: tracker.pulls.length,
    checklistTotal,
    checklistCollectedCount,
    outstandingChecklist,
  };
}
