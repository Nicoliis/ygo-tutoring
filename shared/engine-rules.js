/*
 * Engine rules for the card details window: pure functions over a collection blob ({ cards, engines, decks, … }),
 * no DOM and no storage. An engine holds at most as many copies of a card as the user owns, never more than
 * MAX_COPIES_PER_SECTION; engines are independent of each other. Needs collection-allocation.js (maxAllowedInGroup).
 */
const ENGINE_SEARCH_MIN_COUNT = 8; // engines needed before the panel offers a name search
const NO_COPIES_LEFT_REASON = "No copies left to add.";
const ENGINE_LIMIT_REASON = `An engine holds at most ${MAX_COPIES_PER_SECTION} copies of a card.`;

function listEngines(collection) {
  return Array.isArray(collection.engines) ? collection.engines : [];
}

function copiesInEngine(engine, cardId) {
  const entry = (engine.cards || []).find((c) => c.cardId === cardId);
  return entry ? entry.quantity : 0;
}

/* The collection card a shown card stands for: by id, then apiId, then name (the identity the Backlog merge uses). */
function resolveOwnedCard(collection, card) {
  const cards = Array.isArray(collection.cards) ? collection.cards : [];
  if (card.id !== undefined && card.id !== null) {
    const byId = cards.find((c) => c.id === card.id);
    if (byId) return byId;
  }
  if (card.apiId !== undefined && card.apiId !== null) {
    const byApi = cards.find((c) => c.apiId === card.apiId);
    if (byApi) return byApi;
  }
  const name = String(card.name || "").trim().toLowerCase();
  return name ? cards.find((c) => String(c.name || "").trim().toLowerCase() === name) || null : null;
}

/* { ok, reason }: may one more copy go into this engine? `extraAvailable` counts copies that can still be saved (pulls). */
function canAddCopy(collection, engineId, ownedCard, extraAvailable = 0) {
  const engine = listEngines(collection).find((e) => e.id === engineId);
  if (!engine || !ownedCard) return { ok: false, reason: "Engines hold cards from your collection." };
  const count = copiesInEngine(engine, ownedCard.id);
  if (count >= MAX_COPIES_PER_SECTION) return { ok: false, reason: ENGINE_LIMIT_REASON };
  const allowed = Math.min(ownedCard.quantityOwned + extraAvailable, MAX_COPIES_PER_SECTION);
  return count < allowed ? { ok: true, reason: "" } : { ok: false, reason: NO_COPIES_LEFT_REASON };
}

/* Puts one more copy in the engine (in place) and returns the new count. */
function addCopy(collection, engineId, cardId) {
  const engine = listEngines(collection).find((e) => e.id === engineId);
  const entry = engine.cards.find((c) => c.cardId === cardId);
  if (entry) entry.quantity += 1;
  else engine.cards.push({ cardId, quantity: 1 });
  return copiesInEngine(engine, cardId);
}

/* Takes one copy out (in place) and returns the new count; the entry goes away with its last copy. */
function removeCopy(collection, engineId, cardId) {
  const engine = listEngines(collection).find((e) => e.id === engineId);
  const entry = engine.cards.find((c) => c.cardId === cardId);
  if (!entry) return 0;
  entry.quantity -= 1;
  if (entry.quantity <= 0) engine.cards = engine.cards.filter((c) => c.cardId !== cardId);
  return copiesInEngine(engine, cardId);
}

/* The engine's entries with `fromCardId` moved to where `toCardId` is (a new array); unchanged when either is missing. */
function moveCardEntry(entries, fromCardId, toCardId) {
  const from = entries.findIndex((e) => e.cardId === fromCardId);
  const to = entries.findIndex((e) => e.cardId === toCardId);
  if (from === -1 || to === -1 || from === to) return entries.slice();
  const moved = entries.slice();
  const [entry] = moved.splice(from, 1);
  moved.splice(to, 0, entry);
  return moved;
}

/* A new engine holding one copy of the card, or null for an empty name. Names do not have to be unique. */
function createEngineWithCard(collection, name, cardId, id) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  const engine = { id, name: trimmed, cards: [{ cardId, quantity: 1 }] };
  if (!Array.isArray(collection.engines)) collection.engines = [];
  collection.engines.push(engine);
  return engine;
}
