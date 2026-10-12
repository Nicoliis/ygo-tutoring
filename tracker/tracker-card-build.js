function buildTrackerCardElement(tracker) {
  const progress = computeTrackerProgress(tracker.id);
  const hasChecklist = tracker.checklist.length > 0;
  const pending = pendingPulls.get(tracker.id) || null;
  const simulateDisabled = !selectedSetName || isFetchingSetPool || !!pending;

  const el = document.createElement("div");
  el.className = "tracker-card";
  el.innerHTML = buildTrackerCardHtml(tracker, progress, pending, hasChecklist, simulateDisabled);

  wireTrackerCardBasics(el, tracker);
  wireTrackerCardSimulate(el, tracker, pending);
  wireTrackerCardChecklist(el, tracker, progress, hasChecklist);

  return el;
}
