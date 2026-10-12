function startPendingPull(trackerId, setName, packCountInput) {
  drawSimulatedPull(setName, packCountInput)
    .then((packs) => {
      if (!packs) return;
      const packCount = Math.floor(Number(packCountInput));
      pendingPulls.set(trackerId, { setName, packCount, packs });
      renderTrackers();
    })
    .catch(() => {});
}

function savePendingPull(trackerId) {
  const pending = pendingPulls.get(trackerId);
  if (!pending) return;
  pending.packs.forEach((pack) => {
    logPull(trackerId, pack.map((c) => c.name).join("\n"));
  });
  pendingPulls.delete(trackerId);
  renderTrackers();
}

function discardPendingPull(trackerId) {
  if (!pendingPulls.has(trackerId)) return;
  pendingPulls.delete(trackerId);
  renderTrackers();
}

function reattemptPendingPull(trackerId) {
  const pending = pendingPulls.get(trackerId);
  if (!pending) return;
  startPendingPull(trackerId, pending.setName, pending.packCount);
}
