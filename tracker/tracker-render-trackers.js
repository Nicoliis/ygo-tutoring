function renderTrackers() {
  trackersListEl.innerHTML = "";

  if (collection.trackers.length === 0) {
    trackersListEl.innerHTML = '<p class="empty-msg">No trackers yet. Create one above.</p>';
    return;
  }

  collection.trackers.forEach((tracker) => {
    trackersListEl.appendChild(buildTrackerCardElement(tracker));
  });
}
