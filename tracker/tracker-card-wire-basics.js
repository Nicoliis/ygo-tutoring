function wireTrackerCardBasics(el, tracker) {
  el.querySelector(".tracker-name-input").addEventListener("change", (e) => {
    if (updateTracker(tracker.id, { name: e.target.value })) renderTrackers();
    else e.target.value = tracker.name;
  });

  el.querySelector(".btn-delete-tracker").addEventListener("click", () => {
    deleteTracker(tracker.id);
  });

  const pullInput = el.querySelector(".pull-input");
  el.querySelector(".btn-log-pull").addEventListener("click", () => {
    if (logPull(tracker.id, pullInput.value)) {
      renderTrackers();
    }
  });
}
