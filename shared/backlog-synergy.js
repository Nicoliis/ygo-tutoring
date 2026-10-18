/*
 * Backlog synergy rules: pure, no DOM, no storage.
 * A "synergy name" is any text between double quotes in the effect text of a card that has an effect.
 *  - Cards with no effect (Normal monsters, and Fusion Monsters that are not also Effect Monsters, whose text is
 *    only flavor or a list of materials) quote no names: what they write is not counted.
 *  - Ritual Monsters and Ritual Spells open with the ritual clause ("...Ritual Summoned with \"Black Luster Ritual\"",
 *    "This card is used to Ritual Summon \"Black Luster Soldier\""): their first sentence is ignored, so the names
 *    in it do not make a synergy. The rest of their text counts as usual.
 *  - A card never counts for a name it quotes when that name is its own full name (it names itself).
 *  - A card is counted for a name when it quotes it, or when its own name contains it AND some card with an
 *    effect quotes it (a different card names it). Unquoted mentions in effect text do not count.
 * Names are CASE SENSITIVE: "Blue-Eyes" and "blue-eyes" are different synergy names, and a card's own name only
 * contains a name when the letters match exactly. Keys are the name with whitespace collapsed (case kept).
 */
const SYNERGY_NAME_MAX = 80;

function cardEffectText(card) {
  return [card.effect, card.desc, card.pendDesc, card.monsterDesc].filter(Boolean).join(" ");
}

/* A Ritual Monster, or a Ritual Spell (a Spell Card of the Ritual kind). */
function isRitualCard(card) {
  const typeText = `${card.type || ""} ${card.frameType || ""}`;
  return /ritual/i.test(typeText) || (/spell/i.test(typeText) && /^ritual$/i.test(String(card.race || "").trim()));
}

/* Where the first sentence ends: at a period outside quotes (a name like "Mr. X" does not end it) or a line break. */
function firstSentenceEnd(text) {
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' || ch === "“" || ch === "”") inQuote = ch === "“" ? true : ch === "”" ? false : !inQuote;
    else if (!inQuote && (ch === "\n" || (ch === "." && (i + 1 === text.length || /\s/.test(text[i + 1]))))) return i + 1;
  }
  return text.length;
}

/* The text names are taken from: the effect text, without the ritual clause of a Ritual card. */
function synergyText(card) {
  const text = cardEffectText(card);
  return isRitualCard(card) ? text.slice(firstSentenceEnd(text)) : text;
}

function synergyKey(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

/* Names between straight ("...") or curly (“...”) double quotes, 1-80 characters, without duplicates of the same spelling. */
function quotedNames(text) {
  const found = [];
  const seen = new Set();
  const pattern = /"([^"]+)"|“([^”]+)”/g;
  let match;
  while ((match = pattern.exec(String(text || ""))) !== null) {
    const name = (match[1] || match[2]).trim().replace(/\s+/g, " ");
    const key = synergyKey(name);
    if (!key || name.length > SYNERGY_NAME_MAX || seen.has(key)) continue;
    seen.add(key);
    found.push(name);
  }
  return found;
}

/* A Fusion Monster that is not also an Effect Monster: its type does not say "effect" and its whole text is one
 * line, the materials, with no effect after them. */
function isVanillaFusion(card) {
  const typeText = `${card.type || ""} ${card.frameType || ""}`;
  if (!/fusion/i.test(typeText) || /effect/i.test(typeText)) return false;
  const lines = [card.effect, card.desc, card.pendDesc, card.monsterDesc]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  return lines.length <= 1;
}

/* Cards whose text is not an effect: Normal monsters (flavor text, unless they have a Pendulum effect) and
 * Fusion Monsters that are not also Effect Monsters (a list of materials). */
function hasNoEffect(card) {
  if (isVanillaFusion(card)) return true;
  const typeText = `${card.type || ""} ${card.frameType || ""}`;
  return /\bnormal\b/i.test(typeText) && !/spell|trap/i.test(typeText) && !card.pendDesc;
}

/* The names a card quotes as part of an effect: none for a card with no effect, and never its own full name. */
function cardQuotedKeys(card) {
  if (hasNoEffect(card)) return new Set();
  const own = synergyKey(card.name);
  const keys = quotedNames(synergyText(card)).map(synergyKey).filter((key) => key !== own);
  return new Set(keys);
}

/* Without an index (nothing known about other cards): quoted by this card, or part of its own name. */
function cardTiedTo(card, key) {
  return cardQuotedKeys(card).has(key) || synergyKey(card.name).includes(key);
}

/* { entries: [{ key, label, count }] (count desc, then label), tied(card, key) }. Each card counts once per key;
 * a name is listed only when at least one card with an effect quotes it. */
function buildSynergyIndex(cards) {
  const labels = new Map();
  const quoters = new Map();
  cards.forEach((card) => {
    const keys = cardQuotedKeys(card);
    quotedNames(synergyText(card)).forEach((name) => {
      const key = synergyKey(name);
      if (keys.has(key) && !labels.has(key)) labels.set(key, name);
    });
    keys.forEach((key) => quoters.set(key, (quoters.get(key) || 0) + 1));
  });
  // a card whose own name contains the key is counted too, because another card with an effect names it
  const tied = (card, key) =>
    cardQuotedKeys(card).has(key) || ((quoters.get(key) || 0) > 0 && synergyKey(card.name).includes(key));
  const counts = new Map(Array.from(labels.keys(), (key) => [key, 0]));
  cards.forEach((card) => {
    const quoted = cardQuotedKeys(card);
    const own = synergyKey(card.name);
    labels.forEach((label, key) => {
      if (quoted.has(key) || own.includes(key)) counts.set(key, counts.get(key) + 1);
    });
  });
  const entries = Array.from(labels, ([key, label]) => ({ key, label, count: counts.get(key) })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
  return { entries, tied };
}
