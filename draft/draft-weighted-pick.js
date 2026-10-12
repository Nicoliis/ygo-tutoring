function weightedRandomPick(pool) {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return pool[pool.length - 1];
}
