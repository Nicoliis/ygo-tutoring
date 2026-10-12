/* Booster Draft — isolated, reusable data tables. No behavior lives here; see draft.js.
   Loaded as a plain classic script (no build step), so these top-level `const`s become
   ordinary globals shared with any script tag that runs after this one on the same page. */

// Curated allowlist of official, mainline TCG booster sets — deliberately excludes
// structure decks, starter/deck kits, tins, duelist packs, battle packs, and
// reprint-only blind-pack products (e.g. Premium Gold, Battles of Legend), none of
// which represent "opening a mainline booster." The YGOPRODeck API has no field that
// classifies a set's product line, so this list is maintained by hand — extend it as
// new mainline boosters release (verify the exact name via cardsets.php first).
// Verified against a live cardsets.php snapshot taken 2026-10-12; mainline boosters
// released after that date (if any) are not yet included — add them here.
const MAINLINE_BOOSTERS = [
  "Legend of Blue Eyes White Dragon",
  "Metal Raiders",
  "Spell Ruler",
  "Pharaoh's Servant",
  "Labyrinth of Nightmare",
  "Legacy of Darkness",
  "Pharaonic Guardian",
  "Magic Ruler",
  "Dark Crisis",
  "Invasion of Chaos",
  "Ancient Sanctuary",
  "Soul of the Duelist",
  "Rise of Destiny",
  "Flaming Eternity",
  "The Lost Millennium",
  "Cybernetic Revolution",
  "Elemental Energy",
  "Shadow of Infinity",
  "Enemy of Justice",
  "Power of the Duelist",
  "Cyberdark Impact",
  "Light of Destruction",
  "Tactical Evolution",
  "The Duelist Genesis",
  "Crossroads of Chaos",
  "Raging Battle",
  "Ancient Prophecy",
  "Stardust Overdrive",
  "Duelist Revolution",
  "Starstrike Blast",
  "Extreme Victory",
  "Photon Shockwave",
  "Order of Chaos",
  "Abyss Rising",
  "Return of the Duelist",
  "Lord of the Tachyon Galaxy",
  "Galactic Overlord",
  "Cosmo Blazer",
  "Shadow Specters",
  "Judgment of the Light",
  "Primal Origin",
  "The New Challengers",
  "Secrets of Eternity",
  "Dimension of Chaos",
  "Clash of Rebellions",
  "The Secret Forces",
  "Duelist Alliance",
  "Crossed Souls",
  "Fusion Enforcers",
  "Breakers of Shadow",
  "Shining Victories",
  "The Dark Illusion",
  "Raging Tempest",
  "Maximum Crisis",
  "Circuit Break",
  "Code of the Duelist",
  "Crimson Crisis",
  "Cybernetic Horizon",
  "Soul Fusion",
  "Flames of Destruction",
  "Dark Neostorm",
  "Rising Rampage",
  "Ignition Assault",
  "Toon Chaos",
  "Eternity Code",
  "Rise of the Duelist",
  "Chaos Impact",
  "Phantom Rage",
  "Mystic Fighters",
  "Dawn of Majesty",
  "Blazing Vortex",
  "Lightning Overdrive",
  "Duel Overload",
  "Phantom Nightmare",
  "Photon Hypernova",
  "Darkwing Blast",
  "Cyberstorm Access",
  "Battle of Chaos",
  "Age of Overlord",
  "Duelist Nexus",
  "Legacy of Destruction",
  "Rage of the Abyss",
];

const DEFAULT_BOOSTER_SIZE = 9;
// Extend this table as specific non-standard-size sets are identified (research.md Decision 2).
const BOOSTER_SIZE_OVERRIDES = {};

// Rarity "glow" ladder for the draft pick display: white -> blue -> yellow -> red -> ... ,
// escalating through the rarer secret/parallel tiers, topping out at an animated
// rainbow glow for Starlight Rare (the rarest regular TCG rarity). Ordered RAREST FIRST —
// getRarityGlow() (draft.js) walks this list top-to-bottom and uses the first entry whose
// `keywords` match (substring, case-insensitive) the card's raw `set_rarity` string, so a
// more specific/rarer phrase (e.g. "Ultra Secret Rare") must be listed above a more generic
// one it would otherwise also match (e.g. "Secret Rare"). `DEFAULT_RARITY_GLOW` is used for
// Common and any unrecognized/missing rarity string.
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
