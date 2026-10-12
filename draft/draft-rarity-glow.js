function getRarityGlow(rarity) {
  const r = (rarity || "").toLowerCase();
  const tier = RARITY_GLOW_TIERS.find((t) => t.keywords.some((kw) => r.includes(kw)));
  return tier || DEFAULT_RARITY_GLOW;
}
