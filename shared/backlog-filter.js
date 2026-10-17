/*
 * Backlog type filter: pure rules + per-profile persistence. No DOM here.
 *
 *   filter = { types: [groupId], values: { [groupId]: { [valueGroup]: [value] } } }
 *
 * - A card belongs to exactly one tab (or none): Pendulum wins over the other monster types, then Link, Xyz,
 *   Synchro, Fusion, Ritual; Spell and Trap; everything else that is a monster is "Monster (normal/effect)".
 * - No ticked tab = no type restriction. Ticked tabs combine with OR; inside a tab value groups combine with AND
 *   and the values of one group with OR. A card missing a value a selected group needs does not match.
 */
const FILTER_GROUPS = [
  { id: "monster", label: "Monster (normal/effect)", valueGroups: ["attribute", "race", "level"] },
  { id: "spell", label: "Spell", valueGroups: ["subtype"] },
  { id: "trap", label: "Trap", valueGroups: ["subtype"] },
  { id: "ritual", label: "Ritual", valueGroups: ["attribute", "race", "level"] },
  { id: "fusion", label: "Fusion", valueGroups: ["attribute", "race", "level"] },
  { id: "synchro", label: "Synchro", valueGroups: ["attribute", "race", "level"] },
  { id: "xyz", label: "Xyz", valueGroups: ["attribute", "race", "rank"] },
  { id: "pendulum", label: "Pendulum", valueGroups: ["attribute", "race", "level", "scale"] },
  { id: "link", label: "Link", valueGroups: ["attribute", "race", "linkval"] },
];

const FILTER_VALUE_LABELS = {
  attribute: "Attribute",
  race: "Race",
  level: "Level",
  rank: "Rank",
  linkval: "Link rating",
  scale: "Scale",
  subtype: "Sub-type",
};

const BACKLOG_FILTER_KEY = "ygoBacklogFilter";

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

function emptyFilter() {
  return { types: [], values: {} };
}

function isFilterActive(filter) {
  return Array.isArray(filter.types) && filter.types.length > 0;
}

function activeTypeCount(filter) {
  return isFilterActive(filter) ? filter.types.length : 0;
}

function matchesFilter(card, filter) {
  if (!isFilterActive(filter)) return true;
  const group = groupOf(card);
  if (!group || !filter.types.includes(group)) return false;
  const selected = (filter.values && filter.values[group]) || {};
  const def = filterGroupDef(group);
  return def.valueGroups.every((vg) => {
    const chosen = selected[vg];
    if (!Array.isArray(chosen) || chosen.length === 0) return true;
    const value = filterValueOf(card, vg);
    return value !== null && chosen.some((c) => String(c) === String(value));
  });
}

/* Keeps only known tabs, known value groups and array selections: a stored filter can never break the Backlog. */
function sanitizeFilter(raw) {
  const filter = emptyFilter();
  if (!raw || typeof raw !== "object") return filter;
  const ids = FILTER_GROUPS.map((g) => g.id);
  if (Array.isArray(raw.types)) filter.types = raw.types.filter((t, i) => ids.includes(t) && raw.types.indexOf(t) === i);
  if (raw.values && typeof raw.values === "object") {
    FILTER_GROUPS.forEach((g) => {
      const stored = raw.values[g.id];
      if (!stored || typeof stored !== "object") return;
      const clean = {};
      g.valueGroups.forEach((vg) => {
        if (Array.isArray(stored[vg]) && stored[vg].length > 0) clean[vg] = stored[vg].slice();
      });
      if (Object.keys(clean).length > 0) filter.values[g.id] = clean;
    });
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
