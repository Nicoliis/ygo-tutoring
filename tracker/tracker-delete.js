function deleteTracker(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  showModal({
    title: "Delete tracker?",
    bodyHtml: `<p>${escapeHtml(
      `Delete tracker "${tracker.name}"? This will not remove any cards it already added to your backlog.`
    )}</p>`,
    buttons: [
      { label: "Cancel" },
      {
        label: "Delete",
        primary: true,
        onClick: () => {
          collection.trackers = collection.trackers.filter((t) => t.id !== trackerId);
          expandedTrackers.delete(trackerId);
          pendingPulls.delete(trackerId);
          saveCollection();
          renderTrackers();
        },
      },
    ],
  });
}
