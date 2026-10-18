/*
 * Backlog type filter: pure rules + per-profile persistence. No DOM here.
 *
 *   filter = { types: [includeId], values: { [groupId]: { [valueGroup]: [value] } }, synergy: [synergyKey] }
 *
 * - A card belongs to exactly one tab (or none): Pendulum wins over the other monster types, then Link, Xyz,
 *   Synchro, Fusion, Ritual; Spell and Trap; everything else that is a monster is "Monster (normal/effect)".
 * - The Monster tab has two include boxes (normal, effect), stored as the ids "monster-normal" and "monster-effect";
 *   every other tab has one include box whose id is the tab id.
 * - No ticked tab = no type restriction. Ticked tabs combine with OR; inside a tab value groups combine with AND
 *   and the values of one group with OR. A card missing a value a selected group needs does not match.
 * - Synergy names (backlog-synergy.js) are cross-type: with names selected a card must be tied to any one of them
 *   (OR), and that rule combines with the type tabs by AND.
 */
const FILTER_GROUPS = [
  { id: "monster", label: "Monster", valueGroups: ["attribute", "race", "level", "atk", "def"] },
  { id: "spell", label: "Spell", valueGroups: ["subtype"] },
  { id: "trap", label: "Trap", valueGroups: ["subtype"] },
  { id: "ritual", label: "Ritual", valueGroups: ["attribute", "race", "level", "atk", "def"] },
  { id: "fusion", label: "Fusion", valueGroups: ["attribute", "race", "level", "atk", "def"] },
  { id: "synchro", label: "Synchro", valueGroups: ["attribute", "race", "level", "atk", "def"] },
  { id: "xyz", label: "Xyz", valueGroups: ["attribute", "race", "rank", "atk", "def"] },
  { id: "pendulum", label: "Pendulum", valueGroups: ["attribute", "race", "level", "scale", "atk", "def"] },
  { id: "link", label: "Link", valueGroups: ["attribute", "race", "linkval", "atk"] }, // Link monsters have no DEF
];

const FILTER_VALUE_LABELS = {
  attribute: "Attribute",
  race: "Race",
  level: "Level",
  rank: "Rank",
  linkval: "Link rating",
  scale: "Scale",
  subtype: "Sub-type",
  atk: "ATK",
  def: "DEF",
};

// ATK and DEF have too many different values for a list: they are filtered with a range { min, max }.
const FILTER_RANGE_GROUPS = ["atk", "def"];

function isRangeGroup(valueGroup) {
  return FILTER_RANGE_GROUPS.includes(valueGroup);
}

const BACKLOG_FILTER_KEY = "ygoBacklogFilter";

/* The include checkboxes of a tab: Monster has two (normal / effect), every other tab has one. */
function filterIncludesOf(groupId) {
  if (groupId === "monster") {
    return [
      { id: "monster-normal", label: "Include normal" },
      { id: "monster-effect", label: "Include effect" },
    ];
  }
  const def = FILTER_GROUPS.find((g) => g.id === groupId);
  return [{ id: groupId, label: `Include ${def ? def.label : groupId} cards` }];
}

function allIncludeIds() {
  return FILTER_GROUPS.flatMap((g) => filterIncludesOf(g.id).map((inc) => inc.id));
}

/* "normal" for monsters without an effect (normal monsters and tokens), "effect" for all other monsters. */
function monsterKind(card) {
  const text = `${card.type || ""} ${card.frameType || ""}`.toLowerCase();
  return text.includes("normal") || text.includes("token") ? "normal" : "effect";
}

/* The include id a card is tested against: its tab id, or monster-normal / monster-effect for monsters. */
function includeIdOf(card) {
  const group = groupOf(card);
  return group === "monster" ? `monster-${monsterKind(card)}` : group;
}

/* Which tab a card is in, or null when its type is not recognizable. */
function groupOf(card) {
  const text = `${card.type || ""} ${card.frameType || ""}`.toLowerCase();
  if (!text.trim()) return null;
  if (text.includes("pendulum")) return "pendulum";
  if (text.includes("link")) return "link";
  if (text.includes("xyz")) return "xyz";
  if (text.includes("synchro")) return "synchro";
  if (text.includes("fusion")) return "fusion";
  if (text.includes("ritual")) return "ritual";
  if (text.includes("spell")) return "spell";
  if (text.includes("trap")) return "trap";
  if (text.includes("monster") || text.includes("token") || /\b(normal|effect)\b/.test(text)) return "monster";
  return null;
}

/* The value a card has for a value group (null when the card does not have it recorded). */
function filterValueOf(card, valueGroup) {
  let value;
  switch (valueGroup) {
    case "attribute": value = card.attribute; break;
    case "race":
    case "subtype": value = card.race; break;
    case "level":
    case "rank": value = card.level; break;
    case "scale": value = card.scale; break;
    case "linkval": value = card.linkval; break;
    case "atk": value = typeof card.atk === "number" ? card.atk : null; break;
    case "def": value = typeof card.def === "number" ? card.def : null; break;
    default: value = null;
  }
  return value === undefined || value === null || value === "" ? null : value;
}

function filterGroupDef(groupId) {
  return FILTER_GROUPS.find((g) => g.id === groupId) || null;
}

/* Values that occur among the cards of one tab, sorted (numbers ascending, text alphabetical). */
function availableValues(cards, groupId) {
  const def = filterGroupDef(groupId);
  const result = {};
  if (!def) return result;
  def.valueGroups.forEach((vg) => {
    if (isRangeGroup(vg)) {
      let min = null;
      let max = null;
      cards.forEach((card) => {
        if (groupOf(card) !== groupId) return;
        const value = filterValueOf(card, vg);
        if (value === null) return;
        min = min === null ? value : Math.min(min, value);
        max = max === null ? value : Math.max(max, value);
      });
      result[vg] = { min, max };
      return;
    }
    const seen = new Set();
    cards.forEach((card) => {
      if (groupOf(card) !== groupId) return;
      const value = filterValueOf(card, vg);
      if (value !== null) seen.add(value);
    });
    result[vg] = Array.from(seen).sort((a, b) =>
      typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))
    );
  });
  return result;
}

/* How many distinct cards of one tab have each value: { [valueGroup]: { [String(value)]: n } }. The Monster tab also
 * gets "monster-normal" / "monster-effect" totals for its two include boxes. Range groups (ATK/DEF) are not counted. */
function valueCounts(cards, groupId) {
  const def = filterGroupDef(groupId);
  const result = {};
  if (!def) return result;
  const listGroups = def.valueGroups.filter((vg) => !isRangeGroup(vg));
  listGroups.forEach((vg) => {
    result[vg] = {};
  });
  if (groupId === "monster") {
    result["monster-normal"] = 0;
    result["monster-effect"] = 0;
  }
  cards.forEach((card) => {
    if (groupOf(card) !== groupId) return;
    if (groupId === "monster") result[`monster-${monsterKind(card)}`] += 1;
    listGroups.forEach((vg) => {
      const value = filterValueOf(card, vg);
      if (value === null) return;
      result[vg][String(value)] = (result[vg][String(value)] || 0) + 1;
    });
  });
  return result;
}

function emptyFilter() {
  return { types: [], values: {}, synergy: [] };
}

function hasTypeSelection(filter) {
  return Array.isArray(filter.types) && filter.types.length > 0;
}

function hasSynergySelection(filter) {
  return Array.isArray(filter.synergy) && filter.synergy.length > 0;
}

function isFilterActive(filter) {
  return hasTypeSelection(filter) || hasSynergySelection(filter);
}

/* The number on the filter icon: ticked types, plus one when any synergy name is selected. */
function activeFilterCount(filter) {
  return (hasTypeSelection(filter) ? filter.types.length : 0) + (hasSynergySelection(filter) ? 1 : 0);
}

/* `synergyIndex` (from buildSynergyIndex over the whole Backlog) is optional; build it once per list, not per card. */
function matchesFilter(card, filter, synergyIndex) {
  if (!isFilterActive(filter)) return true;
  const tied = synergyIndex ? synergyIndex.tied : cardTiedTo;
  if (hasSynergySelection(filter) && !filter.synergy.some((key) => tied(card, key))) return false;
  return !hasTypeSelection(filter) || matchesTypeRule(card, filter);
}

function matchesTypeRule(card, filter) {
  const group = groupOf(card);
  if (!group || !filter.types.includes(includeIdOf(card))) return false;
  const selected = (filter.values && filter.values[group]) || {};
  const def = filterGroupDef(group);
  return def.valueGroups.every((vg) => {
    const chosen = selected[vg];
    if (isRangeGroup(vg)) {
      if (!chosen || (chosen.min === null && chosen.max === null)) return true;
      const number = filterValueOf(card, vg);
      if (number === null) return false;
      return (chosen.min === null || number >= chosen.min) && (chosen.max === null || number <= chosen.max);
    }
    if (!Array.isArray(chosen) || chosen.length === 0) return true;
    const value = filterValueOf(card, vg);
    return value !== null && chosen.some((c) => String(c) === String(value));
  });
}

/* Keeps only known tabs, known value groups and array selections: a stored filter can never break the Backlog. */
function sanitizeFilter(raw) {
  const filter = emptyFilter();
  if (!raw || typeof raw !== "object") return filter;
  const ids = allIncludeIds();
  if (Array.isArray(raw.types)) {
    // an older saved filter used the single id "monster": it meant normal and effect monsters
    const expanded = raw.types.flatMap((t) => (t === "monster" ? ["monster-normal", "monster-effect"] : [t]));
    filter.types = expanded.filter((t, i) => ids.includes(t) && expanded.indexOf(t) === i);
  }
  if (raw.values && typeof raw.values === "object") {
    FILTER_GROUPS.forEach((g) => {
      const stored = raw.values[g.id];
      if (!stored || typeof stored !== "object") return;
      const clean = {};
      g.valueGroups.forEach((vg) => {
        if (isRangeGroup(vg)) {
          const range = stored[vg];
          const toNumber = (x) => (typeof x === "number" && Number.isFinite(x) ? x : null);
          const min = range ? toNumber(range.min) : null;
          const max = range ? toNumber(range.max) : null;
          if (min !== null || max !== null) clean[vg] = { min, max };
        } else if (Array.isArray(stored[vg]) && stored[vg].length > 0) {
          clean[vg] = stored[vg].slice();
        }
      });
      if (Object.keys(clean).length > 0) filter.values[g.id] = clean;
    });
  }
  if (Array.isArray(raw.synergy)) {
    const keys = raw.synergy
      .filter((k) => typeof k === "string")
      .map(synergyKey)
      .filter((k) => k && k.length <= SYNERGY_NAME_MAX);
    filter.synergy = keys.filter((k, i) => keys.indexOf(k) === i);
  }
  return filter;
}

/* ---- Per-profile persistence (needs save-utils.js and profiles.js) ---- */

function loadBacklogFilter() {
  return sanitizeFilter(loadData(profileKey(BACKLOG_FILTER_KEY)));
}

/* Unknown top-level fields already stored are kept (saveData merges); the filter itself is replaced. */
function saveBacklogFilter(filter) {
  const clean = sanitizeFilter(filter);
  if (!isFilterActive(clean)) return clearBacklogFilter();
  return saveData(clean, profileKey(BACKLOG_FILTER_KEY));
}

function clearBacklogFilter() {
  return removeData(profileKey(BACKLOG_FILTER_KEY));
}

/* ---- Search: name, effect text, attribute, race and type ---- */

function cardSearchText(card) {
  return [card.name, card.attribute, card.race, card.type, card.effect, card.desc, card.pendDesc, card.monsterDesc]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/* Every word of the query must appear somewhere in the card's name, effect, attribute, race or type. */
function cardMatchesSearch(card, query) {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = cardSearchText(card);
  return words.every((word) => text.includes(word));
}

/* ---- Sorting ---- */

const BACKLOG_SORTS = [
  { id: "added", label: "Added order" },
  { id: "name-asc", label: "Name A → Z" },
  { id: "name-desc", label: "Name Z → A" },
  { id: "rarity-desc", label: "Rarity: rarest first" },
  { id: "rarity-asc", label: "Rarity: most common first" },
  { id: "qty-desc", label: "Copies: most first" },
  { id: "type", label: "Card type" },
  { id: "level-desc", label: "Level / rank: high first" },
  { id: "atk-desc", label: "ATK: high first" },
  { id: "def-desc", label: "DEF: high first" },
];

const BACKLOG_SORT_KEY = "ygoBacklogSort";

function cardRarityRank(card) {
  const printing = typeof rarestPrinting === "function" ? rarestPrinting(card) : null;
  return printing ? rarityRank(printing.rarity) : -1;
}

/* New array sorted by the chosen order; ties fall back to the name so the order is always stable. */
function sortBacklogCards(cards, sortId) {
  const byName = (a, b) => String(a.name).localeCompare(String(b.name));
  const numberDesc = (pick) => (a, b) => (pick(b) ?? -1) - (pick(a) ?? -1) || byName(a, b);
  const groupIndex = (card) => {
    const index = FILTER_GROUPS.findIndex((g) => g.id === groupOf(card));
    return index === -1 ? FILTER_GROUPS.length : index;
  };
  const compare = {
    "name-asc": byName,
    "name-desc": (a, b) => byName(b, a),
    "rarity-desc": (a, b) => cardRarityRank(b) - cardRarityRank(a) || byName(a, b),
    "rarity-asc": (a, b) => cardRarityRank(a) - cardRarityRank(b) || byName(a, b),
    "qty-desc": numberDesc((c) => c.quantityOwned),
    type: (a, b) => groupIndex(a) - groupIndex(b) || byName(a, b),
    "level-desc": numberDesc((c) => c.level),
    "atk-desc": numberDesc((c) => c.atk),
    "def-desc": numberDesc((c) => c.def),
  }[sortId];
  return compare ? cards.slice().sort(compare) : cards.slice();
}

function loadBacklogSort() {
  const stored = loadData(profileKey(BACKLOG_SORT_KEY));
  return BACKLOG_SORTS.some((s) => s.id === stored) ? stored : "added";
}

function saveBacklogSort(sortId) {
  return sortId === "added" ? removeData(profileKey(BACKLOG_SORT_KEY)) : saveData(sortId, profileKey(BACKLOG_SORT_KEY));
}
