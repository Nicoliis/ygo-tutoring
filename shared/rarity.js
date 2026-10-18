/*
 * Rarity tiers, ordered from MOST COMMON to RAREST (rank = position + 1; unmatched/unknown = rank 0).
 * Colors climb: faint white -> white -> green (Rare) -> blue (Super Rare) -> yellow (Ultra Rare) -> purple ->
 * magenta -> pink -> red, with metals and foils beyond,
 * and foil-style rarities use a multi-color shine (`shine`) so every rarity keeps its own look.
 * A rarity string is matched against every keyword; the LONGEST matching keyword wins, so
 * "Ultra Secret Rare" is never taken for "Secret Rare" or "Rare", whatever the order here.
 */
const RARITY_GLOW_TIERS = [
  { id: "short-print", keywords: ["short print"], color: "#ffffff" },
  { id: "super-short-print", keywords: ["super short print"], color: "#cfe8ff" },
  { id: "normal-parallel", keywords: ["normal parallel"], color: "#94a3b8" },
  { id: "rare", keywords: ["rare"], color: "#22c55e" },
  { id: "parallel-rare", keywords: ["parallel rare"], color: "#84cc16" },
  { id: "super-rare", keywords: ["super rare"], color: "#3b82f6" },
  { id: "super-parallel", keywords: ["super parallel"], color: "#38bdf8" },
  { id: "ultra-rare", keywords: ["ultra rare"], color: "#facc15" },
  { id: "ultra-parallel", keywords: ["ultra parallel"], color: "#f59e0b" },
  { id: "pharaohs-rare", keywords: ["pharaoh"], shine: ["#facc15", "#a855f7", "#facc15"] },
  { id: "holographic", keywords: ["holographic"], shine: ["#22d3ee", "#c084fc", "#f9a8d4"] },
  { id: "mosaic", keywords: ["mosaic"], shine: ["#3b82f6", "#22d3ee", "#34d399"] },
  { id: "shatterfoil", keywords: ["shatterfoil"], shine: ["#e5e7eb", "#93c5fd", "#fde68a"] },
  { id: "starfoil", keywords: ["starfoil"], shine: ["#fde047", "#fb923c", "#f472b6"] },
  { id: "ultimate", keywords: ["ultimate"], color: "#a855f7" },
  { id: "secret", keywords: ["secret"], color: "#d946ef" },
  { id: "secret-parallel", keywords: ["secret parallel"], color: "#fb7185" },
  { id: "extra-secret", keywords: ["extra secret"], color: "#f43f5e" },
  { id: "ghost", keywords: ["ghost"], color: "#99f6e4" },
  { id: "gold", keywords: ["gold rare"], color: "#d4a017" },
  { id: "gold-secret", keywords: ["gold secret"], color: "#e6b800" },
  { id: "premium-gold", keywords: ["premium gold"], color: "#f8f402" },
  { id: "platinum", keywords: ["platinum rare"], color: "#bad5f8" },
  { id: "ten-thousand-secret", keywords: ["10000 secret"], color: "#ea580c" },
  { id: "ultra-secret", keywords: ["ultra secret"], color: "#ef4444" },
  { id: "platinum-secret", keywords: ["platinum secret"], color: "#a5b4fc" },
  { id: "collectors", keywords: ["collector"], color: "#b45309" },
  { id: "prismatic-secret", keywords: ["prismatic secret"], color: "#ec4899" },
  { id: "quarter-century-secret", keywords: ["quarter century secret"], shine: ["#ef4444", "#ec4899", "#f97316"] },
  { id: "starlight", keywords: ["starlight"], rainbow: true },
];
// Common (and anything unmatched): almost transparent white.
const DEFAULT_RARITY_GLOW = { id: "common", color: "rgba(255, 255, 255, 0.22)" };
const UNKNOWN_RARITY_LABEL = "Unknown rarity";

function getRarityGlow(rarity) {
  const r = (rarity || "").toLowerCase();
  let best = null;
  let bestLength = 0;
  RARITY_GLOW_TIERS.forEach((tier) => {
    tier.keywords.forEach((kw) => {
      if (r.includes(kw) && kw.length >= bestLength) {
        best = tier; // ties go to the later (rarer) tier
        bestLength = kw.length;
      }
    });
  });
  return best || DEFAULT_RARITY_GLOW;
}

/* Higher = rarer. Common, unmatched and unknown/null rarities are rank 0. */
function rarityRank(rarity) {
  const index = RARITY_GLOW_TIERS.indexOf(getRarityGlow(rarity));
  return index === -1 ? 0 : index + 1;
}

function rarityLabel(rarity) {
  const text = (rarity || "").trim();
  return text || UNKNOWN_RARITY_LABEL;
}

/* New array: common first, rarest last; ties by price ascending. */
function sortPackByRarity(cards) {
  return cards.slice().sort((a, b) => {
    const byRank = rarityRank(a.rarity) - rarityRank(b.rarity);
    return byRank !== 0 ? byRank : (a.price || 0) - (b.price || 0);
  });
}

/* Glow only for known rarities; unknown rarity gets no glow. */
function applyRarityGlow(el, rarity) {
  el.classList.add("rarity-glow");
  el.classList.remove("glow-starlight", "glow-shine");
  if (!(rarity || "").trim()) {
    el.style.setProperty("--glow-color", "transparent");
    return;
  }
  const glow = getRarityGlow(rarity);
  if (glow.rainbow) {
    el.classList.add("glow-starlight");
  } else if (glow.shine) {
    el.classList.add("glow-shine");
    glow.shine.forEach((color, i) => el.style.setProperty(`--shine-${i + 1}`, color));
  } else {
    el.style.setProperty("--glow-color", glow.color);
  }
}

function buildRarityBadge(rarity) {
  const badge = document.createElement("span");
  badge.className = "rarity-badge";
  badge.textContent = rarityLabel(rarity);
  if ((rarity || "").trim()) {
    const glow = getRarityGlow(rarity);
    badge.style.setProperty("--badge-color", glow.rainbow ? "#ff4ec4" : glow.shine ? glow.shine[0] : glow.color);
  }
  return badge;
}
