// One simulated pull of N packs becomes N separate packs here (not one flat list),
// so each can later be logged as its own Pull — packsOpened is derived as pulls.length.
function drawSimulatedPull(setName, packCountInput) {
  const packCount = Math.floor(Number(packCountInput));
  if (!Number.isFinite(packCount) || packCount < 1) {
    alert("Enter a pack count of at least 1.");
    return Promise.resolve(null);
  }
  return fetchSetCardPool(setName).then((pool) => {
    if (!pool || pool.length === 0) {
      alert("That set has no cards to draw from.");
      return null;
    }
    const packs = [];
    for (let p = 0; p < packCount; p++) {
      const pack = [];
      for (let i = 0; i < CARDS_PER_PACK; i++) {
        pack.push(weightedRandomPick(pool));
      }
      packs.push(pack);
    }
    return packs;
  });
}
