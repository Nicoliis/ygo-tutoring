// Ordered RAREST FIRST: getRarityGlow() matches top-to-bottom by substring, so a more
// specific phrase ("Ultra Secret Rare") must precede a more generic one it also contains
// ("Secret Rare"). Unmatched rarities (including Common) fall back to DEFAULT_RARITY_GLOW.
const RARITY_GLOW_TIERS = [
  { id: "starlight", keywords: ["starlight"], animated: true },
  { id: "quarter-century-secret", keywords: ["quarter century secret"], color: "#ff4e4e" },
  { id: "prismatic-secret", keywords: ["prismatic secret"], color: "#ff4e98" },
  { id: "ultra-secret", keywords: ["ultra secret"], color: "#ff4ec4" },
  { id: "collectors", keywords: ["collector's", "collectors"], color: "#e68a00" },
  { id: "platinum", keywords: ["platinum"], color: "#bad5f8" },
  { id: "premium-gold", keywords: ["premium gold"], color: "#f8f402" },
  { id: "gold", keywords: ["gold rare", "gold secret"], color: "#e6b800" },
  { id: "ghost", keywords: ["ghost"], color: "#4de0e0" },
  { id: "secret", keywords: ["secret"], color: "#b24aff" },
  { id: "ultimate", keywords: ["ultimate"], color: "#ff8c1a" },
  { id: "super", keywords: ["super"], color: "#ffd83d" },
  { id: "rare", keywords: ["rare"], color: "#4aa3ff" },
];
const DEFAULT_RARITY_GLOW = { id: "common", color: "#f5f5f5" };
